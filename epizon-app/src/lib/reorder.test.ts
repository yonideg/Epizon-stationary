import { describe, expect, it } from "vitest";
import { calculateReorder } from "./reorder";

describe("reorder (TEST I)", () => {
  it("computes reorder point and suggested quantity", () => {
    const result = calculateReorder({
      currentStock: 5,
      unitsSoldInPeriod: 30,
      periodDays: 30,
      reorderThreshold: 3,
      leadTimeDays: 7,
      safetyStockDays: 7,
    });
    expect(result.averageDailyDemand).toBe(1);
    expect(result.reorderPoint).toBe(14);
    expect(result.suggestedOrderQty).toBeGreaterThan(0);
    expect(result.priority).toBe("HIGH");
  });
});
