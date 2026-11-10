import { describe, expect, it } from "vitest";
import { bankFromIban, isValidIban, isValidNationalId, maskIban, normalizeIban } from "@/lib/identity";
import { amortizationSchedule, monthlyInstallment } from "@/lib/solar";

describe("national ID check", () => {
  it("accepts a code with the right check digit, in Persian digits too", () => {
    expect(isValidNationalId("0084575948")).toBe(true);
    expect(isValidNationalId("۰۰۸۴۵۷۵۹۴۸")).toBe(true);
  });
  it("rejects a wrong check digit, repeated digits and short codes", () => {
    expect(isValidNationalId("0084575947")).toBe(false);
    expect(isValidNationalId("1111111111")).toBe(false);
    expect(isValidNationalId("12345")).toBe(false);
  });
});

describe("Sheba (IBAN) check", () => {
  it("accepts a valid Melli Sheba with or without IR and spaces", () => {
    expect(isValidIban("IR050170000000123456789012")).toBe(true);
    expect(isValidIban("05 0170 0000 0012 3456 7890 12")).toBe(true);
    expect(normalizeIban("ir05-0170000000123456789012")).toBe("IR050170000000123456789012");
  });
  it("rejects a Sheba with a wrong check number", () => {
    expect(isValidIban("IR060170000000123456789012")).toBe(false);
  });
  it("names the bank from the Sheba", () => {
    expect(bankFromIban("IR050170000000123456789012")).toBe("بانک ملی");
  });
  it("shows only the last four digits", () => {
    expect(maskIban("IR050170000000123456789012")).toBe("IR•• •••• •••• 9012");
  });
});

describe("installment schedule", () => {
  const rows = amortizationSchedule(3e9, 0.12, 60);
  it("has one row per month and ends at zero balance", () => {
    expect(rows).toHaveLength(60);
    expect(rows.at(-1)?.balance).toBe(0);
  });
  it("repays exactly the loan amount", () => {
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBeCloseTo(3e9, 0);
  });
  it("charges the same monthly installment as the loan screen", () => {
    expect(rows[0]!.payment).toBeCloseTo(monthlyInstallment(3e9, 0.12, 60), 0);
    expect(rows[30]!.payment).toBeCloseTo(monthlyInstallment(3e9, 0.12, 60), 0);
  });
  it("has no rows without a loan", () => {
    expect(amortizationSchedule(0, 0.12, 60)).toEqual([]);
  });
});
