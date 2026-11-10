import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Cpu, Droplets } from "lucide-react";
import { BottomNav, BigStat, InfoRow, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { AreaCurve, Bars } from "@/components/eco/charts";
import { EmptyStep } from "@/components/eco/empty";
import { plantQuery, settlementsQuery } from "@/lib/queries";
import {
  dailyCurve,
  MONTH_DAYS,
  monthlyProduction,
  OPERATIONAL_STAGE,
  PERFORMANCE_RATIO,
  RECONCILE_TOLERANCE,
  simulatedDayKwh,
} from "@/lib/solar";
import { fa, faDigits, SHAMSI_MONTHS, shamsiParts } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/monitoring")({
  head: () => ({
    meta: [
      { title: "پایش تولید | اکوسولار" },
      { name: "description", content: "منحنی تولید روزانه، ماهانه و سالانه، وضعیت اینورتر و هشدارهای نیروگاه." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(plantQuery), context.queryClient.ensureQueryData(settlementsQuery)]),
  component: Monitoring,
});

type Period = "day" | "month" | "year";

function Monitoring() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const { data: settlements } = useSuspenseQuery(settlementsQuery);
  const [period, setPeriod] = useState<Period>("day");

  const view = useMemo(() => {
    if (!plant) return null;
    const annual = Number(plant.annual_kwh);
    const { month, day } = shamsiParts();
    const today = simulatedDayKwh(annual, month, day);
    const curve = dailyCurve(today);
    const now = new Date();
    const idx = Math.max(0, Math.min(curve.length - 1, Math.round((now.getHours() + now.getMinutes() / 60 - 6) * 2)));
    const days = Array.from({ length: MONTH_DAYS[month] ?? 30 }, (_, i) => (i + 1 <= day ? simulatedDayKwh(annual, month, i + 1) : 0));
    const monthSoFar = days.reduce((s, v) => s + v, 0);
    return { annual, month, day, today, curve, idx, days, monthSoFar, year: monthlyProduction(annual) };
  }, [plant]);

  if (!plant || !view) {
    return (
      <>
        <ScreenHeader title="پایش تولید" />
        <EmptyStep step={{ to: "/design", label: "دیدن طرح نیروگاه" }} title="هنوز نیروگاهی ندارید" text="پس از طراحی و نصب نیروگاه، تولید آن این‌جا پایش می‌شود." />
      </>
    );
  }

  if (plant.stage < OPERATIONAL_STAGE) {
    return (
      <>
        <ScreenHeader title="پایش تولید" />
        <EmptyStep
          step={{ to: "/plant", label: "پیگیری پرونده نیروگاه" }}
          title="پایش پس از بهره‌برداری فعال می‌شود"
          text="وقتی کنتور دوطرفه نصب و قرارداد فعال شود، تولید لحظه‌ای اینورتر این‌جا نمایش داده می‌شود."
        />
      </>
    );
  }

  const issues = settlements.filter((s) => {
    const inv = Number(s.inverter_kwh);
    return inv > 0 && Math.abs(inv - Number(s.energy_kwh)) / inv > RECONCILE_TOLERANCE;
  });
  const lifetime = settlements.reduce((s, x) => s + Number(x.inverter_kwh), 0) + view.monthSoFar;
  const peak = Math.max(...view.curve.map((c) => c.kw));
  const tabs: { id: Period; label: string }[] = [
    { id: "day", label: "روز" },
    { id: "month", label: "ماه" },
    { id: "year", label: "سال" },
  ];

  return (
    <>
      <ScreenHeader title="پایش تولید" subtitle={`${plant.inverter} | ${fa(Number(plant.capacity_kw), 1)} کیلووات`} />
      <div className="px-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-full bg-card p-1 shadow-soft">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPeriod(t.id)}
                className={cn("rounded-full px-4 py-1.5 text-xs font-bold", period === t.id ? "bg-ink text-ink-foreground" : "")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Pill tone="muted">شبیه‌سازی پایلوت</Pill>
        </div>

        <div className="mt-4">
          {period === "day" && (
            <>
              <BigStat label="تولید امروز" value={fa(view.today, 1)} unit="kWh" />
              <div className="mt-3">
                <AreaCurve
                  points={view.curve.map((c) => c.kw)}
                  marker={view.idx}
                  markerLabel={`${fa(view.curve[view.idx]?.kw ?? 0, 1)} kW`}
                  xLabels={["۶ صبح", "۱۲ ظهر", "۶ عصر"]}
                />
                <p className="mt-1 text-center text-[11px] text-muted-foreground">اوج توان {fa(peak, 1)} کیلووات</p>
              </div>
            </>
          )}
          {period === "month" && (
            <>
              <BigStat label={`تولید ${SHAMSI_MONTHS[view.month]} تا امروز`} value={fa(view.monthSoFar)} unit="kWh" />
              <div className="mt-3">
                <Bars
                  values={view.days}
                  labels={view.days.map((_, i) => ((i + 1) % 5 === 0 || i === 0 ? faDigits(String(i + 1)) : ""))}
                  highlight={view.day - 1}
                  height={160}
                />
              </div>
            </>
          )}
          {period === "year" && (
            <>
              <BigStat label="تولید سالانه طرح" value={fa(view.annual)} unit="kWh" />
              <div className="mt-3">
                <Bars values={view.year} labels={SHAMSI_MONTHS.map((m) => m.slice(0, 3))} highlight={view.month} height={160} />
              </div>
            </>
          )}
        </div>
      </div>

      <SunPanel className="space-y-3 pb-3">
        <PanelTitle hint="آخرین ارتباط: شبیه‌سازی">
          <span className="flex items-center gap-2"><Cpu className="h-5 w-5" /> وضعیت دستگاه</span>
        </PanelTitle>
        <div>
          <InfoRow label="اینورتر" value={plant.inverter} />
          <InfoRow label="سریال" value={plant.inverter_serial ? <span dir="ltr">{plant.inverter_serial}</span> : <Link to="/contract" className="underline">ثبت نشده</Link>} />
          <InfoRow label="وضعیت" value={<Pill tone="success">● در حال تولید</Pill>} />
          <InfoRow label="نسبت عملکرد PR" value={`${fa(PERFORMANCE_RATIO * 100)}٪`} />
          <InfoRow label="تولید کل از بهره‌برداری" value={`${fa(lifetime)} kWh`} />
        </div>

        <PanelTitle>هشدارها</PanelTitle>
        {issues.length > 0 ? (
          <Link to="/revenue" className="ink-card flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <span className="flex-1 text-xs">
              اختلاف بیش از {fa(RECONCILE_TOLERANCE * 100)}٪ بین اینورتر و کنتور در {issues.map((i) => i.period_label).join("، ")}
            </span>
          </Link>
        ) : (
          <div className="ink-card flex items-center gap-3 p-4 text-xs">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> افت عملکرد یا ناهنجاری دیده نشد
          </div>
        )}
        <Link to="/maintenance" className="ink-card flex items-center gap-3 p-4 text-xs">
          <Droplets className="h-5 w-5 shrink-0" />
          <span className="flex-1">گردوغبار اصفهان تولید را کم می‌کند؛ شست‌وشوی پنل هر ۳ ماه توصیه می‌شود</span>
          <Pill tone="ink">درخواست</Pill>
        </Link>
        <p className="text-center text-[11px] opacity-70">تا اتصال واقعی اینورتر، اعداد این صفحه از طرح نیروگاه و الگوی آب‌وهوای اصفهان شبیه‌سازی می‌شوند.</p>
      </SunPanel>
      <BottomNav />
    </>
  );
}
