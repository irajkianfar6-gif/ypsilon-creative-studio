import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BatteryCharging, Info, Lock, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, InfoRow, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Bars } from "@/components/eco/charts";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { billQuery, currentUserId, plantQuery, ratesQuery } from "@/lib/queries";
import {
  annualConsumption,
  annualProduction,
  BATTERY_MIN_KWH,
  MAX_KW,
  MIN_KW,
  monthlyProduction,
  PANEL_WATT,
  panelCount,
  recommendCapacity,
  roofArea,
} from "@/lib/solar";
import { fa, SHAMSI_MONTHS, shamsiParts } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/design")({
  head: () => ({ meta: [{ title: "طرح نیروگاه پیشنهادی | اکوسولار" }, { name: "description", content: "ظرفیت، تجهیزات و تولید سالانه نیروگاه خورشیدی پیشنهادی." }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(billQuery),
      context.queryClient.ensureQueryData(plantQuery),
      context.queryClient.ensureQueryData(ratesQuery),
    ]),
  component: Design,
});

function Design() {
  const { data: bill } = useSuspenseQuery(billQuery);
  const { data: plant } = useSuspenseQuery(plantQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const suggested = bill
    ? recommendCapacity(annualConsumption({ peak_kwh: Number(bill.peak_kwh), mid_kwh: Number(bill.mid_kwh), offpeak_kwh: Number(bill.offpeak_kwh), amount_rial: Number(bill.amount_rial) }))
    : 5;
  const [kw, setKw] = useState<number>(plant ? Number(plant.capacity_kw) : suggested);
  const [battery, setBattery] = useState<boolean>(plant?.has_battery ?? true);
  const [busy, setBusy] = useState(false);
  const locked = !!plant && plant.stage > 0;

  if (!bill) {
    return (
      <>
        <ScreenHeader title="طرح پیشنهادی نیروگاه" subtitle="سرویس ۲ | هوش مصنوعی" back={false} />
        <EmptyStep step={{ to: "/bill", label: "ثبت قبض برق" }} title="ابتدا قبض را ثبت کنید" text="ظرفیت نیروگاه بر اساس مصرف واقعی شما محاسبه می‌شود." />
        <div className="mt-auto"><BottomNav /></div>
      </>
    );
  }

  const panels = panelCount(kw);
  const area = roofArea(panels);
  const annual = annualProduction(kw);
  const monthly = monthlyProduction(annual);
  const { month } = shamsiParts();

  async function save() {
    setBusy(true);
    try {
      const payload = {
        capacity_kw: kw,
        panel_count: panels,
        panel_watt: PANEL_WATT,
        inverter: `${fa(Math.ceil(kw))} کیلووات، متصل به شبکه ۲ MPPT`,
        roof_area_m2: area,
        has_battery: battery,
        annual_kwh: annual,
      };
      if (plant && !locked) {
        const resetChannel = !battery && plant.channel === "guaranteed_battery" ? { channel: null } : {};
        const { error } = await supabase.from("plants").update({ ...payload, ...resetChannel }).eq("id", plant.id);
        if (error) throw error;
      } else if (!plant) {
        const { error } = await supabase.from("plants").insert({ ...payload, user_id: await currentUserId() });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["plant"] });
      navigate({ to: "/channels" });
    } catch {
      toast.error("ذخیره طرح انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ScreenHeader title="طرح پیشنهادی نیروگاه" subtitle="سرویس ۲ | هوش مصنوعی" back={false} />
      <div className="px-5">
        <p className="text-xs text-muted-foreground">ظرفیت پیشنهادی</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="flex items-baseline gap-2">
            <span className="num text-5xl font-black">{fa(kw, 1)}</span>
            <span className="text-sm text-muted-foreground">کیلووات پیک</span>
          </p>
          {!locked && (
            <div className="flex items-center gap-1 rounded-full bg-card p-1 shadow-soft">
              <button type="button" aria-label="افزایش ظرفیت" disabled={kw >= MAX_KW} onClick={() => setKw((k) => Math.min(MAX_KW, k + 0.5))} className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30">
                <Plus className="h-4 w-4" />
              </button>
              <button type="button" aria-label="کاهش ظرفیت" disabled={kw <= MIN_KW} onClick={() => setKw((k) => Math.max(MIN_KW, k - 0.5))} className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30">
                <Minus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill>تولید سالانه {fa(annual)} kWh</Pill>
          <Pill tone="muted">پیشنهاد سیستم: {fa(suggested, 1)} kW</Pill>
        </div>
        <div className="mt-5">
          <Bars values={monthly} labels={SHAMSI_MONTHS.map((m) => m.slice(0, 3))} highlight={month} />
        </div>
      </div>

      <SunPanel className="space-y-3 pb-3">
        <PanelTitle hint={<Info className="h-4 w-4" />}>مشخصات طرح</PanelTitle>
        <div>
          <InfoRow label="پنل" value={`${fa(panels)} عدد ${fa(PANEL_WATT)} وات`} />
          <InfoRow label="اینورتر" value={`${fa(Math.ceil(kw))} کیلووات، ۲ MPPT`} />
          <InfoRow label="مساحت لازم بام" value={`${fa(area)} متر مربع`} />
          <InfoRow label="جهت و شیب" value="جنوب، ۳۰ درجه" />
        </div>
        <label className="ink-card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
            <BatteryCharging className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-extrabold">نسخه باتری‌دار</span>
            <span className="block text-[11px] text-muted-foreground">
              حداقل {fa(BATTERY_MIN_KWH, 1)} kWh — شرط خرید تضمینی باتری‌دار؛ شارژ باتری از شبکه مجاز نیست
            </span>
          </span>
          <Switch checked={battery} disabled={locked} onCheckedChange={setBattery} aria-label="نسخه باتری‌دار" />
        </label>
        {locked && (
          <p className="flex items-center gap-1.5 text-xs opacity-80">
            <Lock className="h-3.5 w-3.5" /> سفارش ثبت شده و طرح قفل است.
          </p>
        )}
        <Button variant="ink" size="xl" className="w-full" disabled={busy} onClick={locked ? () => navigate({ to: "/channels" }) : save}>
          {busy ? "در حال ذخیره…" : "مقایسه کانال‌های درآمد"}
        </Button>
      </SunPanel>
      <BottomNav />
    </>
  );
}
