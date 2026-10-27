import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "owner" | "employee";

export interface AppProfile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
}

export async function getSessionProfile(): Promise<AppProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;
  return profile as AppProfile;
}

export async function requireAuth(): Promise<AppProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireOwner(): Promise<AppProfile> {
  const profile = await requireAuth();
  if (profile.role !== "owner") redirect("/pos");
  return profile;
}
