import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, Gauge as GaugeIcon, User } from "lucide-react";
import { useMemo } from "react";
import { BottomNav, BigStat, InfoRow, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { AreaCurve } from "@/components/eco/charts";
import { EmptyStep } from "@/components/eco/empty";
import { billQuery, plantQuery, ratesQuery } from "@/lib/queries";
import { nextStep, rateFor } from "@/lib/flow";
import { dailyCurve, dailyProduction, OPERATIONAL_STAGE, PERFORMANCE_RATIO, PERMIT_STAGES } from "@/lib/solar";
import { fa, moneyText, shamsiParts } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "نیروگاه من | اکوسولار" }, { name: "description", content: "تولید امروز، درآمد و وضعیت نیروگاه خورشیدی شما." }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(plantQuery),
      context.queryClient.ensureQueryData(billQuery),
      context.queryClient.ensureQueryData(ratesQuery),
    ]),
  component: Home,
});

function Home() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const { data: bill } = useSuspenseQuery(billQuery);
  const { data: rates } = useSuspenseQuery(ratesQuery);
  const step = nextStep(!!bill, plant);

  const profileLink = (
    <Link to="/profile" aria-label="پروفایل" className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft">
      <User className="h-5 w-5" />
    </Link>
  );

  const view = useMemo(() => {
    if (!plant) return null;
    const { month } = shamsiParts();
    const today = dailyProduction(Number(plant.annual_kwh), month);
    const curve = dailyCurve(today);
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const idx = Math.max(0, Math.min(curve.length - 1, Math.round((hour - 6) * 2)));
    const peak = Math.max(...curve.map((c) => c.kw));
    return { today, curve, idx, peak };
  }, [plant]);

  if (!bill || !plant || !view) {
    return (
      <>
        <ScreenHeader title="اکوسولار" subtitle="خوش آمدید" back={false} leading={profileLink} />
        <EmptyStep
          step={step!}
          title={!bill ? "قدم اول: قبض برق" : "طرح نیروگاه شما آماده است"}
          text={
            !bill
              ? "با ثبت اطلاعات قبض، مصرف شما تحلیل می‌شود و ظرفیت مناسب نیروگاه خورشیدی پیشنهاد می‌شود."
              : "بر اساس قبض شما، ظرفیت، تجهیزات و تولید سالانه محاسبه شده است."
          }
        />
        <div className="mt-auto">
          <BottomNav />
        </div>
      </>
    );
  }

  const operational = plant.stage >= OPERATIONAL_STAGE;
  const rate = rateFor(rates, plant.channel);
  const revenueToday = rate ? view.today * Number(rate.rate_rial_per_kwh) : 0;

  return (
    <>
      <ScreenHeader title={plant.name} subtitle={`${fa(Number(plant.capacity_kw), 1)} کیلووات | ${plant.city}`} back={false} leading={profileLink} />
      <div className="px-5">
        <div className="flex items-end justify-between">
          <BigStat label="تولید امروز" value={fa(view.today, 1)} unit="kWh" />
          <Pill tone="muted">روز</Pill>
        </div>
        <div className="mt-3">
          {operational ? <Pill tone="success">● زنده | اینورتر</Pill> : <Pill tone="muted">پیش‌بینی | پیش از بهره‌برداری</Pill>}
        </div>
        <div className="mt-4">
          <AreaCurve
            points={view.curve.map((c) => c.kw)}
            marker={view.idx}
            markerLabel={`${fa(view.curve[view.idx]?.kw ?? 0, 1)} kW`}
            xLabels={["۶ صبح", "۱۲ ظهر", "۶ عصر"]}
          />
          <p className="mt-1 text-center text-[11px] text-muted-foreground">اوج تولید {fa(view.peak, 1)} کیلووات</p>
        </div>
      </div>

      <SunPanel className="space-y-3 pb-3">
        <PanelTitle hint={operational ? "مبنای صورتحساب: کنتور رسمی توزیع" : "برآورد بر اساس طراحی"}>جریان انرژی امروز</PanelTitle>
        <div>
          <InfoRow label="تولید اینورتر" value={`${fa(view.today, 1)} kWh`} />
          {rate && (
            <InfoRow
              label="درآمد امروز"
              value={
                <span className="flex items-center gap-2">
                  <Pill tone="ink">برآورد</Pill>
                  {moneyText(revenueToday)}
                </span>
              }
            />
          )}
          <InfoRow label="بازده عملکرد PR" value={`${fa(PERFORMANCE_RATIO * 100)}٪`} />
        </div>

        {step ? (
          <Link to={step.to} className="ink-card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
              <GaugeIcon className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold">{step.label}</span>
              <span className="block text-xs text-muted-foreground">
                {step.to === "/plant" ? `مرحله ${fa(plant.stage + 1)} از ${fa(PERMIT_STAGES.length)}: ${PERMIT_STAGES[plant.stage]?.title}` : "قدم بعدی مسیر نیروگاه شما"}
              </span>
            </span>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <Link to="/revenue" className="ink-card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
              <GaugeIcon className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold">صورتحساب و قرائت کنتور</span>
              <span className="block text-xs text-muted-foreground">تطبیق سه‌طرفه و صورتحساب ماهانه</span>
            </span>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
      </SunPanel>
      <BottomNav />
    </>
  );
}
