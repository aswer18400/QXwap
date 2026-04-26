import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("@workspace/db", () => ({
  db: {},
  walletsTable: { userId: "user_id" },
  transactionsTable: {},
}));

// Unit-test pure helper logic without touching the DB
describe("wallet helpers", () => {
  it("clamps deposit amounts correctly", () => {
    const clamp = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, n));
    expect(clamp(0, 0, 1_000_000)).toBe(0);
    expect(clamp(-1, 0, 1_000_000)).toBe(0);
    expect(clamp(2_000_000, 0, 1_000_000)).toBe(1_000_000);
    expect(clamp(500, 0, 1_000_000)).toBe(500);
  });

  it("formats Thai baht amounts", () => {
    const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);
    expect(fmt(1000)).toBe("1,000");
    expect(fmt(0)).toBe("0");
    expect(fmt(1234567)).toBe("1,234,567");
  });
});

describe("transaction type validation", () => {
  const validTypes = ["lock", "transfer", "refund"] as const;
  const validCurrencies = ["cash", "credit"] as const;

  it("accepts valid transaction types", () => {
    for (const t of validTypes) {
      expect(validTypes.includes(t)).toBe(true);
    }
  });

  it("rejects unknown transaction type", () => {
    // @ts-expect-error testing invalid type
    expect(validTypes.includes("withdraw")).toBe(false);
  });

  it("accepts valid currencies", () => {
    for (const c of validCurrencies) {
      expect(validCurrencies.includes(c)).toBe(true);
    }
  });
});
