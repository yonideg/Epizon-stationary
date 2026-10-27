import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatETB } from "@/lib/money";
import { redirect } from "next/navigation";

async function addExpenseAction(formData: FormData) {
  "use server";
  const profile = await requireOwner();
  const admin = createServiceClient();
  const { data: category } = await admin
    .from("expense_categories")
    .select("id")
    .eq("name", "Other operating expenses")
    .single();

  const amount = Number(formData.get("amount"));
  const { error } = await admin.from("expenses").insert({
    expense_date: String(formData.get("expenseDate")),
    category_id: category?.id,
    description: String(formData.get("description")),
    amount,
    payment_method: formData.get("paymentMethod") as "cash" | "mobile_money" | "bank_transfer",
    recorded_by: profile.id,
  });
  if (error) throw new Error(error.message);

  if (formData.get("paymentMethod") === "cash") {
    await admin.from("cash_movements").insert({
      direction: "out",
      amount,
      category: "cash_expense",
      payment_method: "cash",
      recorded_by: profile.id,
      notes: String(formData.get("description")),
    });
  }
  redirect("/expenses");
}

export default async function ExpensesPage() {
  await requireOwner();
  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, expense_date, description, amount, payment_method")
    .order("expense_date", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Expenses</h1>
      <Card>
        <CardHeader>
          <CardTitle>Record expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addExpenseAction} className="grid gap-3 md:grid-cols-2">
            <Input name="expenseDate" type="date" required />
            <Input name="amount" type="number" step="0.01" placeholder="Amount" required />
            <Input name="description" placeholder="Description" required className="md:col-span-2" />
            <select name="paymentMethod" className="h-10 rounded-md border px-3 text-sm" defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile money</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(expenses ?? []).map((e) => (
            <div key={e.id} className="flex justify-between border-b py-2">
              <span>
                {e.expense_date} — {e.description}
              </span>
              <span>{formatETB(Number(e.amount))}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
