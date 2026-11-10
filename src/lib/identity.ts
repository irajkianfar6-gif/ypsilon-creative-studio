import { asciiDigits } from "@/lib/format";

/** Iranian national code (کد ملی): 10 digits with a mod-11 check digit. */
export function isValidNationalId(input: string) {
  const id = asciiDigits(input).replace(/\D/g, "");
  if (!/^\d{10}$/.test(id) || /^(\d)\1{9}$/.test(id)) return false;
  const digits = id.split("").map(Number);
  const check = digits[9]!;
  const sum = digits.slice(0, 9).reduce((s, d, i) => s + d * (10 - i), 0);
  const r = sum % 11;
  return r < 2 ? check === r : check === 11 - r;
}

/** Normalises user input to the canonical "IR" + 24 digits form. */
export function normalizeIban(input: string) {
  const raw = asciiDigits(input).toUpperCase().replace(/[\s-]/g, "");
  return raw.startsWith("IR") ? raw : `IR${raw}`;
}

/** Sheba (IBAN) check: IR + 24 digits, ISO 13616 mod-97 = 1. */
export function isValidIban(input: string) {
  const iban = normalizeIban(input);
  if (!/^IR\d{24}$/.test(iban)) return false;
  const moved = iban.slice(4) + "1827" + iban.slice(2, 4); // I=18, R=27
  let rem = 0;
  for (const ch of moved) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

const BANKS: Record<string, string> = {
  "010": "بانک مرکزی",
  "011": "بانک صنعت و معدن",
  "012": "بانک ملت",
  "013": "بانک رفاه",
  "014": "بانک مسکن",
  "015": "بانک سپه",
  "016": "بانک کشاورزی",
  "017": "بانک ملی",
  "018": "بانک تجارت",
  "019": "بانک صادرات",
  "020": "بانک توسعه صادرات",
  "021": "پست بانک",
  "053": "بانک کارآفرین",
  "054": "بانک پارسیان",
  "055": "بانک اقتصاد نوین",
  "056": "بانک سامان",
  "057": "بانک پاسارگاد",
  "058": "بانک سرمایه",
  "059": "بانک سینا",
  "061": "بانک شهر",
  "062": "بانک آینده",
  "066": "بانک دی",
  "069": "بانک ایران زمین",
  "070": "بانک رسالت",
  "078": "بانک خاورمیانه",
};

export function bankFromIban(input: string) {
  const iban = normalizeIban(input);
  return /^IR\d{5}/.test(iban) ? (BANKS[iban.slice(4, 7)] ?? null) : null;
}

/** Show only the last four digits of a Sheba, e.g. IR•• •••• … 9012. */
export function maskIban(iban: string | null | undefined) {
  if (!iban) return "—";
  return `IR•• •••• •••• ${iban.slice(-4)}`;
}

export function maskNationalId(id: string | null | undefined) {
  if (!id) return "—";
  return `${id.slice(0, 3)}•••••${id.slice(-2)}`;
}
