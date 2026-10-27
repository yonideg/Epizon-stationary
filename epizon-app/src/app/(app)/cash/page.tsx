import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { openShift, closeShift } from "@/lib/actions/cash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatETB } from "@/lib/money";
import { redirect } from "next/navigation";

async function openShiftAction(formData: FormData) {
  "use server";
  await openShift(Number(formData.get("openingCash") || 0));
  redirect("/cash");
}

async function closeShiftAction(formData: FormData) {
  "use server";
  const result = await closeShift({
    shiftId: String(formData.get("shiftId")),
    actualCash: Number(formData.get("actualCash")),
    notes: String(formData.get("notes") || ""),
  });
  redirect(`/cash?expected=${result.expected}&variance=${result.variance}`);
}

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{ expected?: string; variance?: string }>;
}) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const { expected, variance } = await searchParams;

  const { data: open } = await supabase
    .from("cash_shifts")
    .select("*")
    .eq("cashier_id", profile.id)
    .eq("status", "open")
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Cash shift</h1>
      {!open ? (
        <Card>
          <CardHeader>
            <CardTitle>Open shift</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={openShiftAction} className="space-y-3">
              <Input name="openingCash" type="number" step="0.01" placeholder="Opening cash in drawer" required />
              <Button type="submit">Open shift</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Close shift</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Opened: {new Date(open.opened_at).toLocaleString()}</p>
            <p>Opening cash: {formatETB(Number(open.opening_cash))}</p>
            <form action={closeShiftAction} className="space-y-3">
              <input type="hidden" name="shiftId" value={open.id} />
              <Input name="actualCash" type="number" step="0.01" placeholder="Counted cash" required />
              <Input name="notes" placeholder="Closing notes" />
              <Button type="submit">Close & reconcile</Button>
            </form>
            {expected && (
              <p className="rounded bg-slate-50 p-2">
                Expected {formatETB(Number(expected))} · Variance {formatETB(Number(variance ?? 0))}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
