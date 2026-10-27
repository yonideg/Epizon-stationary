import { requireAuth } from "@/lib/auth/session";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  await requireAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Point of Sale</h1>
      <PosClient />
    </div>
  );
}
