/** Monetary helpers using integer minor units (cents) to avoid float drift. */

export function toMinor(units: number): number {
  return Math.round(units * 100);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

export function parseMoneyInput(value: string | number): number {
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100) / 100;
}

export function formatETB(amount: number, symbol = "Br"): string {
  const formatted = new Intl.NumberFormat("en-ET", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol} ${formatted}`;
}

export function sumLineTotals(quantities: number[], unitPrices: number[]): number {
  if (quantities.length !== unitPrices.length) {
    throw new Error("Line arrays length mismatch");
  }
  let totalMinor = 0;
  for (let i = 0; i < quantities.length; i++) {
    const lineMinor = Math.round(quantities[i] * unitPrices[i] * 100);
    totalMinor += lineMinor;
  }
  return fromMinor(totalMinor);
}

export function weightedAverageCost(
  currentQty: number,
  currentAvg: number,
  receivedQty: number,
  receivedUnitCost: number,
): number {
  if (receivedQty <= 0) return currentAvg;
  const totalQty = currentQty + receivedQty;
  if (totalQty <= 0) return receivedUnitCost;
  return (currentQty * currentAvg + receivedQty * receivedUnitCost) / totalQty;
}
