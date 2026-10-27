"use server";

import { z } from "zod";
import { requireOwner, requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseMoneyInput } from "@/lib/money";

const productSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  barcode: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().optional(),
  unit: z.string().default("pcs"),
  purchaseCost: z.number().min(0),
  sellingPrice: z.number().min(0),
  reorderThreshold: z.number().min(0).default(0),
  reorderQuantity: z.number().min(0).default(0),
  openingStock: z.number().min(0).default(0),
});

export async function createProduct(raw: z.infer<typeof productSchema>) {
  await requireOwner();
  const input = productSchema.parse(raw);
  const admin = createServiceClient();
  const profile = await requireAuth();

  const { data: existing } = await admin
    .from("products")
    .select("id")
    .eq("sku", input.sku)
    .maybeSingle();
  if (existing) throw new Error("SKU already exists");

  const purchaseCost = parseMoneyInput(input.purchaseCost);
  const sellingPrice = parseMoneyInput(input.sellingPrice);

  const { data: product, error } = await admin
    .from("products")
    .insert({
      sku: input.sku,
      barcode: input.barcode || null,
      name: input.name,
      category_id: input.categoryId || null,
      brand: input.brand || null,
      unit: input.unit,
      purchase_cost: purchaseCost,
      selling_price: sellingPrice,
      weighted_avg_cost: purchaseCost,
      stock_quantity: input.openingStock,
      reorder_threshold: input.reorderThreshold,
      reorder_quantity: input.reorderQuantity,
    })
    .select("id")
    .single();

  if (error || !product) throw new Error(error?.message ?? "Failed to create product");

  if (input.openingStock > 0) {
    await admin.from("inventory_movements").insert({
      product_id: product.id,
      movement_type: "opening",
      quantity_delta: input.openingStock,
      unit_cost: purchaseCost,
      balance_after: input.openingStock,
      reason: "Opening stock",
      created_by: profile.id,
    });
  }

  await admin.from("audit_logs").insert({
    user_id: profile.id,
    action: "product_created",
    entity_type: "product",
    entity_id: product.id,
    after_data: { sku: input.sku, name: input.name },
  });

  return { productId: product.id };
}

export async function searchProducts(query: string) {
  await requireAuth();
  const supabase = await createClient();
  const q = query.trim();
  let builder = supabase
    .from("products")
    .select("id, sku, name, barcode, selling_price, promo_price, stock_quantity, status")
    .eq("status", "active")
    .order("name")
    .limit(50);

  if (q) {
    builder = builder.or(
      `name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`,
    );
  }

  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return data ?? [];
}
