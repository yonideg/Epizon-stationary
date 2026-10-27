export interface ProfitInput {
  grossItemSales: number;
  discounts: number;
  salesReturns: number;
  costOfGoodsSold: number;
  operatingExpenses: number;
}

export interface ProfitResult {
  netSales: number;
  grossProfit: number;
  netOperatingProfit: number;
  incompleteCostData: boolean;
}

export function calculateProfit(input: ProfitInput): ProfitResult {
  const netSales = input.grossItemSales - input.discounts - input.salesReturns;
  const grossProfit = netSales - input.costOfGoodsSold;
  const netOperatingProfit = grossProfit - input.operatingExpenses;
  const incompleteCostData = input.costOfGoodsSold <= 0 && netSales > 0;

  return { netSales, grossProfit, netOperatingProfit, incompleteCostData };
}

export function inventoryValueAtCost(
  items: { quantity: number; unitCost: number }[],
): number {
  let totalMinor = 0;
  for (const item of items) {
    totalMinor += Math.round(item.quantity * item.unitCost * 100);
  }
  return totalMinor / 100;
}

export function expectedClosingCash(input: {
  openingCash: number;
  cashSales: number;
  otherCashIn: number;
  cashRefunds: number;
  cashExpenses: number;
  ownerWithdrawals: number;
  cashTransferredOut: number;
}): number {
  return (
    input.openingCash +
    input.cashSales +
    input.otherCashIn -
    input.cashRefunds -
    input.cashExpenses -
    input.ownerWithdrawals -
    input.cashTransferredOut
  );
}
