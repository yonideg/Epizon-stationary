import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calculateProfit } from "@/lib/profit";
import { formatETB } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
  await requireOwner();
  const supabase = await createClient();

  const { data: sales } = await supabase
    .from("sales")
    .select("total, discount_amount, cost_of_goods_sold")
    .eq("status", "completed");

  const { data: expenses } = await supabase.from("expenses").select("amount");

  const grossItemSales = (sales ?? []).reduce((s, r) => s + Number(r.total) + Number(r.discount_amount), 0);
  const discounts = (sales ?? []).reduce((s, r) => s + Number(r.discount_amount), 0);
  const cogs = (sales ?? []).reduce((s, r) => s + Number(r.cost_of_goods_sold), 0);
  const operatingExpenses = (expenses ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const profit = calculateProfit({
    grossItemSales,
    discounts,
    salesReturns: 0,
    costOfGoodsSold: cogs,
    operatingExpenses,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Financial reports</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Net sales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatETB(profit.netSales)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gross profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-green-700">
            {formatETB(profit.grossProfit)}
            {profit.incompleteCostData && (
              <p className="mt-1 text-xs font-normal text-amber-700">Some product costs may be missing</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Est. net operating profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatETB(profit.netOperatingProfit)}</CardContent>
        </Card>
      </div>
      <p className="text-sm text-slate-500">
        Export detailed CSV reports from Settings once your Supabase project is connected.
      </p>
    </div>
  );
}
