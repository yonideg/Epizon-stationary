"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { businessDateFromTimestamp } from "@/lib/dates";
import { parseMoneyInput, sumLineTotals } from "@/lib/money";
import { requireAuth } from "@/lib/auth/session";

const paymentSchema = z.object({
  method: z.enum(["cash", "bank_transfer", "mobile_money", "credit", "other"]),
  amount: z.number().positive(),
  tendered: z.number().optional(),
});

const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
  payments: z.array(paymentSchema).min(1),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export async function checkoutSale(raw: CheckoutInput) {
  const profile = await requireAuth();
  const input = checkoutSchema.parse(raw);

  const supabase = await createClient();
  const admin = createServiceClient();

  const { data: existing } = await admin
    .from("sales")
    .select("id, transaction_number")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { ok: true as const, saleId: existing.id, transactionNumber: existing.transaction_number, duplicate: true };
  }

  const productIds = input.lines.map((l) => l.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, stock_quantity, selling_price, promo_price, weighted_avg_cost, purchase_cost, status")
    .in("id", productIds);

  if (productsError || !products?.length) {
    throw new Error("Products not found");
  }

  const settings = await admin.from("business_settings").select("allow_negative_stock").single();
  const allowNegative = settings.data?.allow_negative_stock ?? false;

  const lineDetails = input.lines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    if (!product || product.status !== "active") {
      throw new Error(`Product unavailable: ${line.productId}`);
    }
    if (!allowNegative && Number(product.stock_quantity) < line.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    const unitPrice = Number(product.promo_price ?? product.selling_price);
    const unitCost = Number(product.weighted_avg_cost || product.purchase_cost || 0);
    const lineTotal = Math.round(line.quantity * unitPrice * 100) / 100;
    const lineCost = Math.round(line.quantity * unitCost * 100) / 100;
    return {
      productId: product.id,
      productName: product.name as string,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
      unitCost,
      lineCost,
      newStock: Number(product.stock_quantity) - line.quantity,
    };
  });

  const subtotal = sumLineTotals(
    lineDetails.map((l) => l.quantity),
    lineDetails.map((l) => l.unitPrice),
  );
  const discount = parseMoneyInput(input.discountAmount);
  const total = Math.round((subtotal - discount) * 100) / 100;

  const paymentsTotal = Math.round(
    input.payments.reduce((s, p) => s + p.amount, 0) * 100,
  ) / 100;

  if (paymentsTotal !== total) {
    throw new Error("Payment total must equal sale total");
  }

  const businessDate = businessDateFromTimestamp(new Date());
  const txnNumber = `S${businessDate.replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
  const cogs = lineDetails.reduce((s, l) => s + l.lineCost, 0);

  const { data: sale, error: saleError } = await admin
    .from("sales")
    .insert({
      transaction_number: txnNumber,
      business_date: businessDate,
      cashier_id: profile.id,
      subtotal,
      discount_amount: discount,
      total,
      cost_of_goods_sold: cogs,
      notes: input.notes,
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();

  if (saleError || !sale) {
    throw new Error(saleError?.message ?? "Failed to create sale");
  }

  await admin.from("sale_items").insert(
    lineDetails.map((l) => ({
      sale_id: sale.id,
      product_id: l.productId,
      product_name: l.productName,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      line_total: l.lineTotal,
      unit_cost: l.unitCost,
      line_cost: l.lineCost,
    })),
  );

  await admin.from("sale_payments").insert(
    input.payments.map((p) => ({
      sale_id: sale.id,
      payment_method: p.method,
      amount: p.amount,
      tendered: p.tendered,
      change_given:
        p.method === "cash" && p.tendered
          ? Math.max(0, Math.round((p.tendered - p.amount) * 100) / 100)
          : null,
    })),
  );

  for (const line of lineDetails) {
    const { error: stockError } = await admin
      .from("products")
      .update({ stock_quantity: line.newStock })
      .eq("id", line.productId);

    if (stockError) throw new Error(stockError.message);

    await admin.from("inventory_movements").insert({
      product_id: line.productId,
      movement_type: "sale",
      quantity_delta: -line.quantity,
      unit_cost: line.unitCost,
      balance_after: line.newStock,
      reference_type: "sale",
      reference_id: sale.id,
      created_by: profile.id,
    });
  }

  const cashAmount = input.payments
    .filter((p) => p.method === "cash")
    .reduce((s, p) => s + p.amount, 0);

  if (cashAmount > 0) {
    const { data: shift } = await admin
      .from("cash_shifts")
      .select("id")
      .eq("cashier_id", profile.id)
      .eq("status", "open")
      .maybeSingle();

    await admin.from("cash_movements").insert({
      shift_id: shift?.id ?? null,
      direction: "in",
      amount: cashAmount,
      category: "cash_sale",
      payment_method: "cash",
      reference_type: "sale",
      reference_id: sale.id,
      recorded_by: profile.id,
    });
  }

  await admin.from("audit_logs").insert({
    user_id: profile.id,
    action: "sale_completed",
    entity_type: "sale",
    entity_id: sale.id,
    after_data: { total, transaction_number: txnNumber },
  });

  return { ok: true as const, saleId: sale.id, transactionNumber: txnNumber, duplicate: false };
}
