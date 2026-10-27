import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  redirect(profile.role === "owner" ? "/dashboard" : "/pos");
}
