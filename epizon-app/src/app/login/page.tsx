import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-white/95 shadow-xl">
        <CardHeader className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-teal-700">
            EPIZÓN
          </p>
          <CardTitle className="text-2xl">Stationary & Electronics</CardTitle>
          <p className="text-sm text-slate-500">Sign in to manage the shop</p>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input id="email" name="email" type="email" required autoComplete="username" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
