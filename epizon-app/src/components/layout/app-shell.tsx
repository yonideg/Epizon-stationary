"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { AppRole } from "@/lib/auth/session";

const ownerLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/cash", label: "Cash & Shifts", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/purchases", label: "Purchasing", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const employeeLinks = [
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/cash", label: "My Shift", icon: Wallet },
  { href: "/sales", label: "My Sales", icon: ShoppingCart },
];

export function AppShell({
  children,
  role,
  userName,
}: {
  children: React.ReactNode;
  role: AppRole;
  userName: string;
}) {
  const pathname = usePathname();
  const links = role === "owner" ? ownerLinks : employeeLinks;
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-slate-950 text-slate-100 transition-transform lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 items-center border-b border-slate-800 px-4">
            <div>
              <p className="text-lg font-semibold tracking-wide">EPIZÓN</p>
              <p className="text-xs text-teal-300">Stationary & Electronics</p>
            </div>
          </div>
          <nav className="space-y-1 p-3">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                    active
                      ? "bg-teal-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 w-full border-t border-slate-800 p-4">
            <p className="truncate text-sm text-slate-300">{userName}</p>
            <p className="text-xs capitalize text-slate-500">{role}</p>
            <form action="/auth/signout" method="post" className="mt-2">
              <Button type="submit" variant="ghost" size="sm" className="text-slate-300">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </form>
          </div>
        </aside>
        <div className="flex flex-1 flex-col lg:ml-0">
          <header className="flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-4 lg:hidden">
            <Button variant="outline" size="icon" onClick={() => setOpen((v) => !v)}>
              <Menu className="h-4 w-4" />
            </Button>
            <span className="font-semibold">EPIZÓN</span>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
