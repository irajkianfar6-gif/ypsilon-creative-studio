import { describe, expect, it } from "vitest";
import {
  annualConsumption,
  annualProduction,
  annualRevenue,
  coveragePercent,
  monthlyInstallment,
  panelCount,
  recommendCapacity,
  MONTH_FACTORS,
} from "@/lib/solar";
import { toNumber } from "@/lib/format";

const sampleBill = { peak_kwh: 312, mid_kwh: 628, offpeak_kwh: 397, amount_rial: 18_250_000 };

describe("solar sizing", () => {
  it("treats a bill as two months of consumption", () => {
    expect(annualConsumption(sampleBill)).toBe(1337 * 6);
  });

  it("recommends 5 kW for the sample Isfahan bill", () => {
    expect(recommendCapacity(annualConsumption(sampleBill))).toBe(5);
  });

  it("caps residential capacity at 10 kW and floors at 1 kW", () => {
    expect(recommendCapacity(1_000_000)).toBe(10);
    expect(recommendCapacity(10)).toBe(1);
  });

  it("uses nine 550 W panels for 5 kW", () => {
    expect(panelCount(5)).toBe(9);
  });

  it("produces about 7,885 kWh a year from 5 kW", () => {
    expect(annualProduction(5)).toBe(7885);
  });

  it("monthly factors cover the whole year", () => {
    expect(MONTH_FACTORS.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
});

describe("finance", () => {
  it("battery guaranteed channel earns about 718.9M rial a year for 5 kW", () => {
    expect(Math.round(annualRevenue(annualProduction(5), 91169) / 1e5) / 10).toBe(718.9);
  });

  it("3 billion rial at 12% over 60 months is about 66.7M a month", () => {
    expect(Math.round(monthlyInstallment(3e9, 0.12, 60) / 1e5) / 10).toBe(66.7);
  });

  it("coverage never exceeds 100%", () => {
    expect(coveragePercent(200, 100)).toBe(100);
    expect(coveragePercent(41, 100)).toBe(41);
  });
});

describe("input parsing", () => {
  it("reads Persian digits", () => {
    expect(toNumber("۳۱۲")).toBe(312);
    expect(toNumber("۱۸٬۲۵۰٬۰۰۰")).toBe(18_250_000);
  });
});

describe("bill numbers shown with Persian separators", () => {
  it("round-trips a formatted amount back to a number", async () => {
    const { fa } = await import("@/lib/format");
    expect(toNumber(fa(18_250_000))).toBe(18_250_000);
    expect(toNumber(fa(312.5, 2))).toBe(312.5);
  });
});
