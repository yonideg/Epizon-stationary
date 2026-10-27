import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatETB } from "@/lib/money";
import { businessDateFromTimestamp } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  await requireOwner();
  const supabase = await createClient();
  const today = businessDateFromTimestamp(new Date());

  const [{ data: salesToday }, { data: expensesToday }, { data: products }] =
    await Promise.all([
      supabase
        .from("sales")
        .select("total, cost_of_goods_sold, id")
        .eq("business_date", today)
        .eq("status", "completed"),
      supabase
        .from("expenses")
        .select("amount")
        .eq("expense_date", today),
      supabase
        .from("products")
        .select("stock_quantity, purchase_cost, weighted_avg_cost, reorder_threshold, status")
        .eq("status", "active"),
    ]);

  const grossSales = (salesToday ?? []).reduce((s, r) => s + Number(r.total), 0);
  const txnCount = salesToday?.length ?? 0;
  const cogs = (salesToday ?? []).reduce((s, r) => s + Number(r.cost_of_goods_sold), 0);
  const grossProfit = grossSales - cogs;
  const expenses = (expensesToday ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const { data: paymentsToday } = await supabase
    .from("sale_payments")
    .select("amount, payment_method, sale_id")
    .in("sale_id", (salesToday ?? []).map((s) => s.id));

  const cashCollected = (paymentsToday ?? [])
    .filter((p) => p.payment_method === "cash")
    .reduce((s, p) => s + Number(p.amount), 0);
  const nonCash = (paymentsToday ?? [])
    .filter((p) => p.payment_method !== "cash")
    .reduce((s, p) => s + Number(p.amount), 0);

  const inventoryValue = (products ?? []).reduce(
    (s, p) =>
      s + Number(p.stock_quantity) * Number(p.weighted_avg_cost || p.purchase_cost),
    0,
  );
  const lowStock = (products ?? []).filter(
    (p) => Number(p.stock_quantity) <= Number(p.reorder_threshold),
  ).length;

  const metrics = [
    { label: "Today's gross sales", value: formatETB(grossSales), tone: "default" },
    { label: "Transactions", value: String(txnCount), tone: "default" },
    { label: "Cash collected", value: formatETB(cashCollected), tone: "success" },
    { label: "Non-cash collected", value: formatETB(nonCash), tone: "default" },
    { label: "Est. gross profit", value: formatETB(grossProfit), tone: "success" },
    { label: "Expenses today", value: formatETB(expenses), tone: "warning" },
    { label: "Inventory at cost", value: formatETB(inventoryValue), tone: "default" },
    { label: "Below reorder threshold", value: String(lowStock), tone: lowStock > 0 ? "danger" : "default" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Business date: {today} (Addis Ababa)</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={
                  m.tone === "success"
                    ? "text-2xl font-semibold text-green-700"
                    : m.tone === "warning"
                      ? "text-2xl font-semibold text-amber-700"
                      : m.tone === "danger"
                        ? "text-2xl font-semibold text-red-700"
                        : "text-2xl font-semibold"
                }
              >
                {m.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {txnCount === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No sales recorded for today yet. Metrics above reflect live database totals (zeros until you record activity).
          </CardContent>
        </Card>
      )}
    </div>
  );
}
