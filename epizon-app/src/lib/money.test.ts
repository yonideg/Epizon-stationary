import { describe, expect, it } from "vitest";
import { formatETB, sumLineTotals, weightedAverageCost } from "./money";

describe("money", () => {
  it("sums line totals without float drift", () => {
    expect(sumLineTotals([2, 1], [10.1, 5.05])).toBe(25.25);
  });

  it("formats ETB", () => {
    expect(formatETB(1234.5)).toMatch(/Br\s1,234\.50/);
  });

  it("weighted average cost", () => {
    expect(weightedAverageCost(10, 5, 10, 7)).toBe(6);
  });
});
