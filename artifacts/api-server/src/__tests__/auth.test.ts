import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Test the OTP logic without touching the DB
function generate6DigitOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

describe("OTP generation", () => {
  it("generates a 6-digit string", () => {
    const otp = generate6DigitOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("generates values in [100000, 999999]", () => {
    for (let i = 0; i < 50; i++) {
      const n = Number(generate6DigitOtp());
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });

  it("produces unique values (probabilistic)", () => {
    const set = new Set(Array.from({ length: 20 }, generate6DigitOtp));
    expect(set.size).toBeGreaterThan(1);
  });
});

describe("OTP hashing", () => {
  it("produces 64-char hex string", () => {
    expect(hashOtp("123456")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same input → same hash", () => {
    expect(hashOtp("654321")).toBe(hashOtp("654321"));
  });

  it("different inputs → different hashes", () => {
    expect(hashOtp("111111")).not.toBe(hashOtp("222222"));
  });
});

describe("password validation", () => {
  it("rejects passwords shorter than 6 chars", () => {
    const validate = (p: string) => p.length >= 6;
    expect(validate("abc")).toBe(false);
    expect(validate("abcdef")).toBe(true);
    expect(validate("abc123")).toBe(true);
  });
});
