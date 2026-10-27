"use client";

import { useMemo, useState, useTransition } from "react";
import { searchProducts } from "@/lib/actions/products";
import { checkoutSale } from "@/lib/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatETB } from "@/lib/money";
import { Trash2 } from "lucide-react";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  selling_price: number;
  promo_price: number | null;
  stock_quantity: number;
};

type CartLine = ProductRow & { quantity: number };

export function PosClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductRow[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cashTendered, setCashTendered] = useState("");
  const [mobileAmount, setMobileAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subtotal = useMemo(
    () =>
      cart.reduce((s, line) => {
        const price = Number(line.promo_price ?? line.selling_price);
        return s + line.quantity * price;
      }, 0),
    [cart],
  );

  async function runSearch() {
    const data = await searchProducts(query);
    setResults(
      data.map((p) => ({
        ...p,
        selling_price: Number(p.selling_price),
        promo_price: p.promo_price ? Number(p.promo_price) : null,
        stock_quantity: Number(p.stock_quantity),
      })),
    );
  }

  function addToCart(product: ProductRow) {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function checkout(mode: "cash" | "split") {
    if (!cart.length) return;
    startTransition(async () => {
      try {
        setMessage(null);
        const idempotencyKey = crypto.randomUUID();
        const payments =
          mode === "cash"
            ? [{ method: "cash" as const, amount: subtotal, tendered: Number(cashTendered || subtotal) }]
            : [
                {
                  method: "cash" as const,
                  amount: Number(mobileAmount ? subtotal - Number(mobileAmount) : subtotal / 2),
                },
                {
                  method: "mobile_money" as const,
                  amount: Number(mobileAmount || subtotal / 2),
                },
              ];

        const result = await checkoutSale({
          idempotencyKey,
          lines: cart.map((l) => ({ productId: l.id, quantity: l.quantity })),
          payments,
          discountAmount: 0,
        });
        setLastReceipt(result.transactionNumber);
        setCart([]);
        setMessage(
          result.duplicate
            ? `Duplicate checkout ignored (${result.transactionNumber})`
            : `Sale completed: ${result.transactionNumber}`,
        );
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Checkout failed");
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Product search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Name, SKU, or barcode"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button type="button" onClick={runSearch}>
              Search
            </Button>
          </div>
          <ul className="divide-y rounded-md border">
            {results.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-slate-500">
                    {p.sku} · Stock {p.stock_quantity} ·{" "}
                    {formatETB(Number(p.promo_price ?? p.selling_price))}
                  </p>
                </div>
                <Button size="sm" onClick={() => addToCart(p)}>
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cart</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cart.map((line) => (
            <div key={line.id} className="flex items-center justify-between text-sm">
              <div>
                <p>{line.name}</p>
                <p className="text-slate-500">× {line.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <span>{formatETB(line.quantity * Number(line.promo_price ?? line.selling_price))}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setCart((c) => c.filter((l) => l.id !== line.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <p className="border-t pt-2 text-lg font-semibold">Total: {formatETB(subtotal)}</p>
          <Input
            placeholder="Cash tendered (cash sales)"
            value={cashTendered}
            onChange={(e) => setCashTendered(e.target.value)}
          />
          <Input
            placeholder="Mobile money portion (split)"
            value={mobileAmount}
            onChange={(e) => setMobileAmount(e.target.value)}
          />
          <Button className="w-full" disabled={pending || !cart.length} onClick={() => checkout("cash")}>
            Complete cash sale
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            disabled={pending || !cart.length}
            onClick={() => checkout("split")}
          >
            Split payment
          </Button>
          {message && <p className="text-sm text-teal-800">{message}</p>}
          {lastReceipt && (
            <div className="rounded border bg-white p-3 text-xs print:block" id="receipt">
              <p className="font-semibold">EPIZÓN Stationary</p>
              <p>Txn: {lastReceipt}</p>
              <p className="text-slate-500">Thank you for shopping at EPIZÓN!</p>
              <Button className="mt-2 no-print w-full" variant="outline" onClick={() => window.print()}>
                Print receipt
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
