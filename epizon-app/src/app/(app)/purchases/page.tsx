import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatETB } from "@/lib/money";

export default async function PurchasesPage() {
  await requireOwner();
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("id, order_number, status, suppliers(name), created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: payables } = await supabase
    .from("supplier_invoices")
    .select("amount, amount_paid, suppliers(name)");

  const outstanding = (payables ?? []).reduce(
    (s, inv) => s + Number(inv.amount) - Number(inv.amount_paid),
    0,
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Purchasing</h1>
      <Card>
        <CardHeader>
          <CardTitle>Supplier payables</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatETB(outstanding)}</p>
          <p className="text-sm text-slate-500">Outstanding across recorded supplier invoices</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Purchase orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(orders ?? []).map((o) => (
            <div key={o.id} className="flex justify-between border-b py-2">
              <span>
                {o.order_number} · {(o.suppliers as { name: string } | null)?.name ?? "—"}
              </span>
              <span className="capitalize">{o.status.replace("_", " ")}</span>
            </div>
          ))}
          {!orders?.length && (
            <p className="text-slate-500">No purchase orders yet. Create suppliers and POs from Settings when ready.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
