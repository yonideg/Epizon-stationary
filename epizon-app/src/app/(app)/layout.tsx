import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  return (
    <AppShell role={profile.role} userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
