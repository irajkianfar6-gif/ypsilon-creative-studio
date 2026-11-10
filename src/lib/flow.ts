import { supabase } from "@/integrations/supabase/client";
import { MONTH_FACTORS, OPERATIONAL_STAGE } from "@/lib/solar";
import { shamsiLabel, shamsiParts } from "@/lib/format";
import type { Plant, Rate } from "@/lib/queries";

export type NextStep = { to: "/bill" | "/design" | "/channels" | "/financing" | "/quotes" | "/plant"; label: string } | null;

/** The next unfinished step of the purchase journey. */
export function nextStep(hasBill: boolean, plant: Plant | null): NextStep {
  if (!hasBill) return { to: "/bill", label: "ثبت قبض برق" };
  if (!plant) return { to: "/design", label: "دیدن طرح نیروگاه پیشنهادی" };
  if (!plant.channel) return { to: "/channels", label: "انتخاب کانال درآمد" };
  if (plant.loan_months === null) return { to: "/financing", label: "بررسی وام و پوشش قسط" };
  if (!plant.supplier) return { to: "/quotes", label: "انتخاب پیش‌فاکتور تجهیزات" };
  if (plant.stage < OPERATIONAL_STAGE) return { to: "/plant", label: "پیگیری پرونده نیروگاه" };
  return null;
}

export function rateFor(rates: Rate[], channel: string | null | undefined) {
  return rates.find((r) => r.channel === channel) ?? null;
}

/** Issues the statement for last month once the plant is in operation. */
export async function issueSettlement(plant: Plant, rate: Rate) {
  const { year, month } = shamsiParts();
  const prev = (month + 11) % 12;
  const prevYear = month === 0 ? year - 1 : year;
  const energy = Math.round(Number(plant.annual_kwh) * (MONTH_FACTORS[prev] ?? 0));
  const inverter = Math.round(energy * 1.023);
  const { error } = await supabase.from("settlements").insert({
    user_id: plant.user_id,
    plant_id: plant.id,
    period_label: shamsiLabel(prev, prevYear),
    energy_kwh: energy,
    inverter_kwh: inverter,
    rate_rial: Number(rate.rate_rial_per_kwh),
    amount_rial: Math.round(energy * Number(rate.rate_rial_per_kwh)),
  });
  if (error) throw error;
}
