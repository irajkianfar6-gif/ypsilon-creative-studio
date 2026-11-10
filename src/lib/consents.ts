import type { Consent } from "@/lib/queries";

/** Partners the user can share data with (SCR-C-04). Required ones gate the contract. */
export const CONSENT_PARTNERS = [
  {
    id: "distribution",
    name: "شرکت توزیع برق استان اصفهان",
    scope: "قرائت کنتور دوطرفه، مشخصات انشعاب و تعرفه",
    purpose: "تطبیق تولید با کنتور رسمی و صدور صورتحساب",
    required: true,
  },
  {
    id: "satba",
    name: "ساتبا و سامانه مهرسان",
    scope: "مشخصات نیروگاه، هویت مالک، شبا و مدارک پرونده",
    purpose: "تشکیل پرونده، قرارداد خرید تضمینی و واریز درآمد",
    required: true,
  },
  {
    id: "bank",
    name: "بانک عامل وام",
    scope: "طرح فنی، پیش‌فاکتور و پیش‌بینی درآمد نیروگاه",
    purpose: "بررسی پرونده وام و برداشت مستقیم قسط",
    required: false,
  },
  {
    id: "psp",
    name: "پرداخت‌یار دارای مجوز",
    scope: "شبای ماسک‌شده و مبالغ واریزی",
    purpose: "واریز درآمد و ثبت تراکنش‌ها",
    required: false,
  },
  {
    id: "crowdfunding",
    name: "سکوی تأمین مالی جمعی دارای مجوز فرابورس",
    scope: "گزارش تولید تجمیعی بدون اطلاعات هویتی",
    purpose: "نمایش عملکرد طرح‌های خوشه‌ای",
    required: false,
  },
] as const;

export type PartnerId = (typeof CONSENT_PARTNERS)[number]["id"];

export function isGranted(list: Consent[], partner: string) {
  return list.some((c) => c.partner === partner && !c.revoked_at);
}

export function missingRequired(list: Consent[]) {
  return CONSENT_PARTNERS.filter((p) => p.required && !isGranted(list, p.id));
}
