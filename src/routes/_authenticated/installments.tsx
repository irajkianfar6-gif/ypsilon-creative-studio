import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";
import { BottomNav, BigStat, InfoRow, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Meter } from "@/components/eco/charts";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { persianDate, plantQuery, ratesQuery, settlementsQuery } from "@/lib/queries";
import { rateFor } from "@/lib/flow";
import { amortizationSchedule, annualRevenue, coveragePercent, LOAN_RATE, OPERATIONAL_STAGE } from "@/lib/solar";
import { fa, money, moneyText, shamsiLabel, shamsiParts } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/installments")({
  head: () => ({
    meta: [
      { title: "اقساط و تراکنش‌ها | اکوسولار" },
      { name: "description", content: "جدول اقساط وام نیروگاه، پوشش قسط با درآمد و تاریخچه واریزها." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(plantQuery),
      context.queryClient.ensureQueryData(settlementsQuery),
      context.queryClient.ensureQueryData(ratesQuery),
    ]),
  component: Installments,
});

function Installments() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const { data: settlements } = useSuspenseQuery(settlementsQuery);
  const { data: rates } = useSuspenseQuery(ratesQuery);
  const [tab, setTab] = useState<"loan" | "ledger">("loan");
  const [all, setAll] = useState(false);

  const loan = Number(plant?.loan_amount_rial ?? 0);
  const months = plant?.loan_months ?? 0;

  if (!plant || loan <= 0 || months <= 0) {
    return (
      <>
        <ScreenHeader title="اقساط و تراکنش‌ها" />
        <EmptyStep
          step={{ to: "/financing", label: "بررسی وام و پوشش قسط" }}
          title="وامی ثبت نشده"
          text="اگر نیروگاه را با وام ساتبا تأمین مالی کنید، جدول اقساط و برداشت‌ها این‌جا نمایش داده می‌شود."
        />
      </>
    );
  }

  const rows = amortizationSchedule(loan, LOAN_RATE, months);
  const pay = rows[0]?.payment ?? 0;
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const rate = rateFor(rates, plant.channel);
  const monthlyRevenue = rate ? annualRevenue(Number(plant.annual_kwh), Number(rate.rate_rial_per_kwh)) / 12 : 0;
  const coverage = coveragePercent(monthlyRevenue, pay);
  const operational = plant.stage >= OPERATIONAL_STAGE;
  const { year, month } = shamsiParts();
  const shown = all ? rows : rows.slice(0, 12);
  const m = money(pay);

  const ledger = settlements.map((s) => ({
    id: s.id,
    title: `واریز ساتبا — ${s.period_label}`,
    amount: Number(s.amount_rial),
    date: s.created_at,
    done: s.status === "confirmed",
  }));

  return (
    <>
      <ScreenHeader title="اقساط و تراکنش‌ها" subtitle="بانک عامل: بانک ملت" />
      <div className="px-5">
        <div className="flex items-end justify-between">
          <BigStat label="قسط ماهانه" value={m.value} unit={m.unit} />
          <Pill tone={operational ? "success" : "muted"}>{operational ? "برداشت مستقیم فعال" : "برنامه برآوردی"}</Pill>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">پوشش قسط با درآمد نیروگاه</span>
            <span className="num font-bold">{fa(coverage)}٪</span>
          </div>
          <Meter value={coverage} max={100} tone="ink" />
        </div>
        <div className="mt-4 flex gap-1 rounded-full bg-card p-1 shadow-soft">
          {([
            ["loan", "جدول اقساط"],
            ["ledger", "تراکنش‌ها"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={cn("flex-1 rounded-full py-2 text-xs font-bold", tab === id ? "bg-ink text-ink-foreground" : "")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <SunPanel className="space-y-3 pb-3">
        {tab === "loan" ? (
          <>
            <PanelTitle hint={`${fa(months)} قسط`}>خلاصه وام</PanelTitle>
            <div>
              <InfoRow label="مبلغ وام" value={moneyText(loan)} />
              <InfoRow label="نرخ سود" value={`${fa(LOAN_RATE * 100)}٪ سالانه`} />
              <InfoRow label="جمع سود" value={moneyText(totalInterest)} />
            </div>
            <div className="ink-card overflow-hidden">
              <div className="grid grid-cols-4 gap-1 border-b border-border px-3 py-2 text-[10px] font-bold text-muted-foreground">
                <span>سررسید</span>
                <span className="text-center">اصل</span>
                <span className="text-center">سود</span>
                <span className="text-left">مانده</span>
              </div>
              {shown.map((r) => (
                <div key={r.n} className="grid grid-cols-4 gap-1 border-b border-border px-3 py-2 text-[11px] last:border-0">
                  <span className="font-bold">{shamsiLabel(month + r.n, year + Math.floor((month + r.n) / 12))}</span>
                  <span className="num text-center">{fa(r.principal / 1e6, 1)}</span>
                  <span className="num text-center">{fa(r.interest / 1e6, 1)}</span>
                  <span className="num text-left">{fa(r.balance / 1e6, 0)}</span>
                </div>
              ))}
              <p className="px-3 pb-2 text-[10px] text-muted-foreground">ارقام به میلیون ریال</p>
            </div>
            {rows.length > 12 && (
              <Button variant="soft" size="lg" className="w-full" onClick={() => setAll((v) => !v)}>
                {all ? "نمایش ۱۲ قسط اول" : `نمایش همه ${fa(rows.length)} قسط`}
              </Button>
            )}
            <p className="text-center text-[11px] opacity-75">
              {operational
                ? "قسط با دستور پرداخت مستقیم از شبای شما برداشت می‌شود."
                : "سررسیدها پس از پرداخت وام به تأمین‌کننده قطعی می‌شوند؛ وام مستقیم به شما پرداخت نمی‌شود."}
            </p>
          </>
        ) : (
          <>
            <PanelTitle hint="فقط خواندنی">تاریخچه تراکنش‌ها</PanelTitle>
            {ledger.length === 0 ? (
              <p className="ink-card p-4 text-center text-xs text-muted-foreground">پس از صدور اولین صورتحساب، واریزها این‌جا ثبت می‌شوند.</p>
            ) : (
              ledger.map((t) => (
                <div key={t.id} className="ink-card flex items-center gap-3 p-3">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", t.done ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
                    {t.done ? <ArrowDownLeft className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-bold">{t.title}</span>
                    <span className="block text-[10px] text-muted-foreground">{t.done ? "واریز شد" : "در انتظار واریز"} | {persianDate(t.date)}</span>
                  </span>
                  <span className="num text-xs font-bold">+{moneyText(t.amount)}</span>
                </div>
              ))
            )}
            {operational && (
              <div className="ink-card flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-xs font-bold">برداشت قسط بعدی</span>
                  <span className="block text-[10px] text-muted-foreground">{shamsiLabel(month + 1, year + Math.floor((month + 1) / 12))}</span>
                </span>
                <span className="num text-xs font-bold">−{moneyText(pay)}</span>
              </div>
            )}
          </>
        )}
      </SunPanel>
      <BottomNav />
    </>
  );
}
