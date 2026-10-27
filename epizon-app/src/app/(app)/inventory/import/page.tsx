import { requireOwner } from "@/lib/auth/session";
import { importProductsCsv } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ImportProductsPage() {
  await requireOwner();
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Import products (CSV)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <p>
          Required columns: <code>sku,name,purchase_cost,selling_price,opening_stock</code>.
          Optional: barcode, reorder_threshold, brand, unit.
        </p>
        <form action={importProductsCsv} className="space-y-3">
          <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm" />
          <Button type="submit">Validate & import</Button>
        </form>
      </CardContent>
    </Card>
  );
}
