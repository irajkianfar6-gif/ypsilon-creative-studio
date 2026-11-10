export function fa(n: number, digits = 0) {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function money(rial: number) {
  const abs = Math.abs(rial);
  if (abs >= 1e9) return { value: fa(rial / 1e9, 2), unit: "میلیارد ریال" };
  if (abs >= 1e6) return { value: fa(rial / 1e6, 1), unit: "میلیون ریال" };
  return { value: fa(rial), unit: "ریال" };
}

export function moneyText(rial: number) {
  const m = money(rial);
  return `${m.value} ${m.unit}`;
}

export const SHAMSI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function shamsiParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month") - 1, day: get("day") };
}

export function shamsiLabel(monthIndex: number, year: number) {
  const m = ((monthIndex % 12) + 12) % 12;
  return `${SHAMSI_MONTHS[m]} ${fa(year).replace(/٬/g, "")}`;
}

/** Accept Persian/Arabic digits and separators in numeric inputs. */
export function toNumber(input: string) {
  const ascii = input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[,٬\s]/g, "")
    .replace(/٫/g, ".");
  const n = Number(ascii);
  return Number.isFinite(n) ? n : NaN;
}

export function faDigits(s: string) {
  return s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
}
