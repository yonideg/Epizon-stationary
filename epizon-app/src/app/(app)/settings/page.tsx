import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

async function saveSettingsAction(formData: FormData) {
  "use server";
  await requireOwner();
  const admin = createServiceClient();
  const { data: row } = await admin.from("business_settings").select("id").limit(1).single();
  if (!row) throw new Error("Settings row missing");
  await admin
    .from("business_settings")
    .update({
      business_name: String(formData.get("businessName")),
      reorder_lead_time_days: Number(formData.get("leadTime") || 7),
      reorder_safety_stock_days: Number(formData.get("safetyDays") || 7),
      allow_negative_stock: formData.get("allowNegative") === "on",
      credit_sales_enabled: formData.get("creditEnabled") === "on",
    })
    .eq("id", row.id);
  redirect("/settings");
}

export default async function SettingsPage() {
  await requireOwner();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("business_settings").select("*").limit(1).single();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Business preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSettingsAction} className="space-y-3">
            <Input name="businessName" defaultValue={settings?.business_name ?? "EPIZÓN Stationary"} />
            <Input name="leadTime" type="number" defaultValue={settings?.reorder_lead_time_days ?? 7} placeholder="Reorder lead time (days)" />
            <Input name="safetyDays" type="number" defaultValue={settings?.reorder_safety_stock_days ?? 7} placeholder="Safety stock (days)" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="allowNegative" defaultChecked={settings?.allow_negative_stock} />
              Allow negative stock (not recommended)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="creditEnabled" defaultChecked={settings?.credit_sales_enabled} />
              Enable customer credit sales
            </label>
            <Button type="submit">Save settings</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Backup & export</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>
            Use Supabase scheduled backups (Pro plan) or pg_dump against your project connection string.
            See <code>docs/BACKUP.md</code> in the repository.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
