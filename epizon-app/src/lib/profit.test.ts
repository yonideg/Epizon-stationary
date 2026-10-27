import { describe, expect, it } from "vitest";
import { calculateProfit, expectedClosingCash } from "./profit";

describe("profit (TEST J)", () => {
  it("separates gross and net operating profit", () => {
    const p = calculateProfit({
      grossItemSales: 1000,
      discounts: 50,
      salesReturns: 20,
      costOfGoodsSold: 600,
      operatingExpenses: 100,
    });
    expect(p.netSales).toBe(930);
    expect(p.grossProfit).toBe(330);
    expect(p.netOperatingProfit).toBe(230);
  });

  it("expected closing cash (TEST F)", () => {
    expect(
      expectedClosingCash({
        openingCash: 100,
        cashSales: 250,
        otherCashIn: 0,
        cashRefunds: 10,
        cashExpenses: 40,
        ownerWithdrawals: 20,
        cashTransferredOut: 0,
      }),
    ).toBe(280);
  });
});
