"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { expectedClosingCash } from "@/lib/profit";
import { parseMoneyInput } from "@/lib/money";

export async function openShift(openingCash: number) {
  const profile = await requireAuth();
  const admin = createServiceClient();

  const { data: existing } = await admin
    .from("cash_shifts")
    .select("id")
    .eq("cashier_id", profile.id)
    .eq("status", "open")
    .maybeSingle();
  if (existing) throw new Error("You already have an open shift");

  const { data, error } = await admin
    .from("cash_shifts")
    .insert({
      cashier_id: profile.id,
      opening_cash: parseMoneyInput(openingCash),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

const closeSchema = z.object({
  shiftId: z.string().uuid(),
  actualCash: z.number().min(0),
  notes: z.string().optional(),
});

export async function closeShift(input: z.infer<typeof closeSchema>) {
  const profile = await requireAuth();
  const parsed = closeSchema.parse(input);
  const admin = createServiceClient();

  const { data: shift } = await admin
    .from("cash_shifts")
    .select("*")
    .eq("id", parsed.shiftId)
    .eq("cashier_id", profile.id)
    .eq("status", "open")
    .single();
  if (!shift) throw new Error("Open shift not found");

  const { data: movements } = await admin
    .from("cash_movements")
    .select("direction, amount, category")
    .eq("shift_id", shift.id);

  let cashSales = 0;
  let cashRefunds = 0;
  let cashExpenses = 0;
  let otherIn = 0;
  let out = 0;

  for (const m of movements ?? []) {
    const amt = Number(m.amount);
    if (m.direction === "in" && m.category === "cash_sale") cashSales += amt;
    else if (m.direction === "out" && m.category === "cash_refund") cashRefunds += amt;
    else if (m.direction === "out" && m.category === "cash_expense") cashExpenses += amt;
    else if (m.direction === "in") otherIn += amt;
    else if (m.direction === "out") out += amt;
  }

  const expected = expectedClosingCash({
    openingCash: Number(shift.opening_cash),
    cashSales,
    otherCashIn: otherIn,
    cashRefunds,
    cashExpenses,
    ownerWithdrawals: out,
    cashTransferredOut: 0,
  });

  const actual = parseMoneyInput(parsed.actualCash);
  const variance = Math.round((actual - expected) * 100) / 100;

  const { error } = await admin
    .from("cash_shifts")
    .update({
      status: "closed",
      expected_closing_cash: expected,
      actual_closing_cash: actual,
      variance,
      closing_notes: parsed.notes,
      closed_at: new Date().toISOString(),
    })
    .eq("id", shift.id);

  if (error) throw new Error(error.message);
  return { expected, actual, variance };
}
