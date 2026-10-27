import Link from "next/link";
import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatETB } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InventoryPage() {
  await requireOwner();
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, name, stock_quantity, selling_price, reorder_threshold, status")
    .order("name")
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <div className="flex gap-2">
          <Link className={buttonVariants({ variant: "outline" })} href="/inventory/import">
            Import CSV
          </Link>
          <Link className={buttonVariants()} href="/inventory/new">
            Add product
          </Link>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p) => {
                const low = Number(p.stock_quantity) <= Number(p.reorder_threshold);
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{p.sku}</td>
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className={`py-2 pr-4 ${low ? "text-red-700 font-medium" : ""}`}>
                      {p.stock_quantity}
                    </td>
                    <td className="py-2 pr-4">{formatETB(Number(p.selling_price))}</td>
                    <td className="py-2 capitalize">{p.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!products?.length && (
            <p className="py-6 text-center text-slate-500">
              No products yet. Add your catalog or import from CSV during setup.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
