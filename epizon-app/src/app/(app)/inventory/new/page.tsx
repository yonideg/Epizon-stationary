import { requireOwner } from "@/lib/auth/session";
import { createProduct } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

async function createProductAction(formData: FormData) {
  "use server";
  await createProduct({
    sku: String(formData.get("sku")),
    name: String(formData.get("name")),
    barcode: String(formData.get("barcode") || "") || undefined,
    purchaseCost: Number(formData.get("purchaseCost")),
    sellingPrice: Number(formData.get("sellingPrice")),
    reorderThreshold: Number(formData.get("reorderThreshold") || 0),
    reorderQuantity: Number(formData.get("reorderQuantity") || 0),
    openingStock: Number(formData.get("openingStock") || 0),
  });
  redirect("/inventory");
}

export default async function NewProductPage() {
  await requireOwner();
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Add product</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createProductAction} className="space-y-3">
          <Input name="sku" placeholder="SKU" required />
          <Input name="name" placeholder="Product name" required />
          <Input name="barcode" placeholder="Barcode (optional)" />
          <Input name="purchaseCost" type="number" step="0.01" placeholder="Purchase cost" required />
          <Input name="sellingPrice" type="number" step="0.01" placeholder="Selling price" required />
          <Input name="openingStock" type="number" step="0.001" placeholder="Opening stock" />
          <Input name="reorderThreshold" type="number" step="0.001" placeholder="Reorder threshold" />
          <Input name="reorderQuantity" type="number" step="0.001" placeholder="Preferred reorder qty" />
          <Button type="submit">Save product</Button>
        </form>
      </CardContent>
    </Card>
  );
}
