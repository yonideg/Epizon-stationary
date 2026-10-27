"use server";

import { requireOwner } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { createProduct } from "@/lib/actions/products";
import { redirect } from "next/navigation";

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((c) => c.trim()));
}

export async function importProductsCsv(formData: FormData) {
  await requireOwner();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("CSV file required");

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV must include header and at least one row");

  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const required = ["sku", "name", "purchase_cost", "selling_price"];
  for (const col of required) {
    if (idx(col) === -1) throw new Error(`Missing column: ${col}`);
  }

  const admin = createServiceClient();
  const profile = await requireOwner();

  const { data: job } = await admin
    .from("import_jobs")
    .insert({
      import_type: "products",
      file_name: file.name,
      status: "processing",
      created_by: profile.id,
    })
    .select("id")
    .single();

  let success = 0;
  let errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const sku = row[idx("sku")];
      if (!sku) throw new Error("SKU required");
      await createProduct({
        sku,
        name: row[idx("name")],
        barcode: idx("barcode") >= 0 ? row[idx("barcode")] : undefined,
        purchaseCost: Number(row[idx("purchase_cost")]),
        sellingPrice: Number(row[idx("selling_price")]),
        openingStock: idx("opening_stock") >= 0 ? Number(row[idx("opening_stock")] || 0) : 0,
        reorderThreshold: idx("reorder_threshold") >= 0 ? Number(row[idx("reorder_threshold")] || 0) : 0,
        reorderQuantity: 0,
      });
      success++;
    } catch (e) {
      errors++;
      if (job?.id) {
        await admin.from("import_errors").insert({
          job_id: job.id,
          row_number: i + 1,
          message: e instanceof Error ? e.message : "Unknown error",
          row_data: Object.fromEntries(header.map((h, j) => [h, row[j]])),
        });
      }
    }
  }

  if (job?.id) {
    await admin
      .from("import_jobs")
      .update({ status: "completed", success_count: success, error_count: errors })
      .eq("id", job.id);
  }

  redirect(`/inventory?imported=${success}&errors=${errors}`);
}
