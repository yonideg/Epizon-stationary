import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatETB } from "@/lib/money";
import { formatDisplayDateTime } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SalesHistoryPage() {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("sales")
    .select("id, transaction_number, total, created_at, status")
    .order("created_at", { ascending: false })
    .limit(50);

  if (profile.role !== "owner") {
    query = query.eq("cashier_id", profile.id);
  }

  const { data: sales } = await query;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{profile.role === "owner" ? "Sales" : "My sales"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(sales ?? []).map((s) => (
            <div key={s.id} className="flex justify-between border-b py-2">
              <span>
                {s.transaction_number} · {formatDisplayDateTime(s.created_at)}
              </span>
              <span>{formatETB(Number(s.total))}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
