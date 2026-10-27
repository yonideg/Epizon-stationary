import { describe, expect, it } from "vitest";
import { businessDateFromTimestamp } from "./dates";

describe("timezone (TEST M)", () => {
  it("assigns Addis Ababa business date near midnight UTC", () => {
    // 2026-01-15 21:30 UTC = 2026-01-16 00:30 in Addis (UTC+3)
    const date = businessDateFromTimestamp("2026-01-15T21:30:00.000Z");
    expect(date).toBe("2026-01-16");
  });
});
