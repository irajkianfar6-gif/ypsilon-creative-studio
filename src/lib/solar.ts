// Engineering and finance rules for the Isfahan pilot.
// Tariff values never live here: they come from the versioned rate_table.

/** Annual specific yield for Isfahan rooftops, kWh per kWp per year. */
export const SPECIFIC_YIELD = 1577;
/** A bill in Iran covers two months; multiply to get yearly consumption. */
export const BILL_MONTHS = 2;
export const PANEL_WATT = 550;
export const ROOF_M2_PER_PANEL = 3.1;
export const BATTERY_MIN_KWH = 7.5;
export const PERFORMANCE_RATIO = 0.83;
export const MIN_KW = 1;
export const MAX_KW = 10;

/** Share of annual production per Persian month (Farvardin → Esfand). Sums to 1. */
export const MONTH_FACTORS = [
  0.085, 0.095, 0.105, 0.11, 0.11, 0.1, 0.09, 0.075, 0.06, 0.055, 0.055, 0.06,
];

export interface BillInput {
  peak_kwh: number;
  mid_kwh: number;
  offpeak_kwh: number;
  amount_rial: number;
}

export function billTotalKwh(b: BillInput) {
  return b.peak_kwh + b.mid_kwh + b.offpeak_kwh;
}

export function annualConsumption(b: BillInput) {
  return billTotalKwh(b) * (12 / BILL_MONTHS);
}

/** Recommended capacity in half-kW steps, clamped to the residential pilot range. */
export function recommendCapacity(annualKwh: number) {
  const raw = annualKwh / SPECIFIC_YIELD;
  const stepped = Math.round(raw * 2) / 2;
  return Math.min(MAX_KW, Math.max(MIN_KW, stepped));
}

export function panelCount(kw: number, watt = PANEL_WATT) {
  return Math.max(1, Math.floor((kw * 1000) / watt));
}

export function roofArea(panels: number) {
  return Math.round(panels * ROOF_M2_PER_PANEL);
}

export function annualProduction(kw: number) {
  return Math.round(kw * SPECIFIC_YIELD);
}

export function monthlyProduction(annualKwh: number) {
  return MONTH_FACTORS.map((f) => Math.round(annualKwh * f));
}

export function dailyProduction(annualKwh: number, monthIndex: number) {
  return (annualKwh * (MONTH_FACTORS[monthIndex] ?? 0)) / 30;
}

/** Bell-shaped output from 6:00 to 18:00 whose area equals the day's kWh. */
export function dailyCurve(kwhToday: number) {
  const peakKw = (kwhToday * Math.PI) / 24;
  return Array.from({ length: 25 }, (_, i) => {
    const hour = 6 + i * 0.5;
    const kw = Math.max(0, peakKw * Math.sin((Math.PI * (hour - 6)) / 12));
    return { hour, kw };
  });
}

export function annualRevenue(annualKwh: number, rateRialPerKwh: number) {
  return annualKwh * rateRialPerKwh;
}

/** Standard annuity installment. */
export function monthlyInstallment(principal: number, annualRate: number, months: number) {
  if (months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export interface InstallmentRow {
  n: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

/** Month-by-month annuity schedule; the last row closes the balance exactly. */
export function amortizationSchedule(principal: number, annualRate: number, months: number): InstallmentRow[] {
  if (principal <= 0 || months <= 0) return [];
  const pay = monthlyInstallment(principal, annualRate, months);
  const r = annualRate / 12;
  const rows: InstallmentRow[] = [];
  let balance = principal;
  for (let n = 1; n <= months; n++) {
    const interest = balance * r;
    const part = n === months ? balance : pay - interest;
    balance = n === months ? 0 : balance - part;
    rows.push({ n, payment: part + interest, interest, principal: part, balance: Math.max(0, balance) });
  }
  return rows;
}

/** Days in each Persian month (Esfand taken as 29). */
export const MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

/**
 * Pilot stand-in for inverter telemetry: the design's daily yield with a
 * repeatable ±15% weather swing per day. Replaced once real devices report.
 */
export function simulatedDayKwh(annualKwh: number, monthIndex: number, day: number) {
  const x = Math.sin((monthIndex + 1) * 97.13 + day * 12.9898) * 43758.5453;
  const swing = 0.85 + 0.3 * (x - Math.floor(x));
  return dailyProduction(annualKwh, monthIndex) * swing;
}

/** Share of meter-vs-inverter gap tolerated before an invoice is flagged. */
export const RECONCILE_TOLERANCE = 0.03;

/** Percent of the installment paid by plant revenue, capped at 100. */
export function coveragePercent(monthlyRevenue: number, installment: number) {
  if (installment <= 0) return 100;
  return Math.min(100, Math.round((monthlyRevenue / installment) * 100));
}

export const LOAN_RATE = 0.12;
export const TARIFF_GROWTH = 0.25;

/** Equipment quote per supplier; price scales with capacity and battery. */
export const SUPPLIERS = [
  { id: "alef", name: "تأمین‌کننده الف", score: 4.7, perKw: 606_000_000, expiresInHours: 48 },
  { id: "be", name: "تأمین‌کننده ب", score: 4.5, perKw: 612_200_000, expiresInHours: 27 },
  { id: "jim", name: "تأمین‌کننده ج", score: 4.2, perKw: 605_600_000, expiresInHours: 0 },
] as const;
export const BATTERY_PRICE_RIAL = 450_000_000;

export function quotePrice(kw: number, perKw: number, battery: boolean) {
  return Math.round(kw * perKw + (battery ? BATTERY_PRICE_RIAL : 0));
}

export const PERMIT_STAGES = [
  { title: "ثبت درخواست", note: "سامانه ساتبا" },
  { title: "تشکیل پرونده در مهرسان", note: "کد رهگیری صادر می‌شود" },
  { title: "بارگذاری مدارک مالکیت و شبا", note: "تأیید مدارک" },
  { title: "بازدید فنی شرکت توزیع", note: "در جریان: مسئول شرکت توزیع" },
  { title: "نصب و راه‌اندازی", note: "پیمانکار منتخب" },
  { title: "تست و نصب کنتور دوطرفه", note: "شرکت توزیع" },
  { title: "شروع بهره‌برداری", note: "فعال‌سازی قرارداد" },
] as const;

export const OPERATIONAL_STAGE = PERMIT_STAGES.length;

/** Peak-shift plans offered by the optimisation service. */
export const PEAK_PLANS = [15, 28, 35] as const;

export function peakSavingsRial(b: BillInput, percent: number) {
  const total = billTotalKwh(b);
  if (total === 0) return 0;
  const peakShare = b.peak_kwh / total;
  return Math.round(b.amount_rial * peakShare * (percent / 100));
}
