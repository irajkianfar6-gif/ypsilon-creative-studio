import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Gauge, Meter } from "@/components/eco/charts";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { plantQuery, ratesQuery } from "@/lib/queries";
import { rateFor } from "@/lib/flow";
import { coveragePercent, LOAN_RATE, monthlyInstallment, quotePrice, SUPPLIERS, TARIFF_GROWTH } from "@/lib/solar";
import { fa, money, moneyText } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/financing")({
  head: () => ({ meta: [{ title: "پوشش قسط وام | اکوسولار" }, { name: "description", content: "شبیه‌ساز چندساله پوشش قسط وام با درآمد نیروگاه." }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(plantQuery), context.queryClient.ensureQueryData(ratesQuery)]),
  component: Financing,
});

const TERMS = [36, 48, 60];

function Financing() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const { data: rates } = useSuspenseQuery(ratesQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const estimate = plant ? quotePrice(Number(plant.capacity_kw), SUPPLIERS[0].perKw, plant.has_battery) : 0;
  const [principal, setPrincipal] = useState<number>(plant?.loan_amount_rial != null ? Number(plant.loan_amount_rial) : Math.round(estimate / 1e8) * 1e8);
  const [months, setMonths] = useState<number>(plant?.loan_months || 60);
  const [busy, setBusy] = useState(false);

  const rate = plant ? rateFor(rates, plant.channel) : null;
  if (!plant || !rate) {
    return (
      <>
        <ScreenHeader title="پوشش قسط وام" />
        <EmptyStep step={{ to: "/channels", label: "انتخاب کانال درآمد" }} title="ابتدا کانال درآمد را انتخاب کنید" text="پوشش قسط بر اساس درآمد ماهانه کانال منتخب محاسبه می‌شود." />
      </>
    );
  }

  const monthlyRevenue = (Number(plant.annual_kwh) * Number(rate.rate_rial_per_kwh)) / 12;
  const installment = monthlyInstallment(principal, LOAN_RATE, months);
  const cover = coveragePercent(monthlyRevenue, installment);
  const gap = Math.max(0, installment - monthlyRevenue);
  const years = [1, 2, 3].map((y) => coveragePercent(monthlyRevenue * Math.pow(1 + TARIFF_GROWTH, y - 1), installment));

  async function save(loan: number, term: number) {
    setBusy(true);
    const { error } = await supabase
      .from("plants")
      .update({ loan_amount_rial: loan, loan_months: loan > 0 ? term : 0 })
      .eq("id", plant!.id);
    setBusy(false);
    if (error) return toast.error("ذخیره انجام نشد");
    await qc.invalidateQueries({ queryKey: ["plant"] });
    navigate({ to: "/quotes" });
  }

  const ways = [
    { title: "وام با کمترین قسط", text: `قسط با بازپرداخت ۶۰ ماهه ${moneyText(monthlyInstallment(principal, LOAN_RATE, 60))}`, run: () => setMonths(60) },
    { title: "پیش‌پرداخت بیشتر", text: "۳۰٪ کمتر وام بگیرید تا قسط کوچک‌تر شود", run: () => setPrincipal((p) => Math.round((p * 0.7) / 1e8) * 1e8) },
    { title: "پرداخت نقدی", text: "بدون وام؛ همه درآمد مستقیم به حساب شما", run: () => setPrincipal(0) },
  ];

  return (
    <>
      <ScreenHeader title="پوشش قسط وام" subtitle="شبیه‌ساز" />
      <div className="px-5">
        <div className="ink-card space-y-3 p-4 shadow-soft">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">مبلغ وام</span>
            <span className="num font-extrabold">{moneyText(principal)}</span>
          </div>
          <Slider dir="rtl" min={0} max={Math.max(5e9, estimate)} step={1e8} value={[principal]} onValueChange={([v]) => setPrincipal(v)} aria-label="مبلغ وام" />
          <div className="flex gap-2">
            {TERMS.map((t) => (
              <button key={t} type="button" onClick={() => setMonths(t)} className={cn("flex-1 rounded-full py-2 text-xs font-bold", months === t ? "bg-ink text-ink-foreground" : "bg-muted")}>
                {fa(t)} ماه
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">نرخ سود {fa(LOAN_RATE * 100)}٪ — برآورد هزینه تجهیزات: {moneyText(estimate)}</p>
        </div>

        <div className="mt-5">
          <Gauge percent={cover} label="پوشش قسط سال اول" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="ink-card p-3 text-center shadow-soft">
            <p className="text-[11px] text-muted-foreground">درآمد ماهانه</p>
            <p className="num mt-1 text-sm font-extrabold">{moneyText(monthlyRevenue)}</p>
          </div>
          <div className="ink-card p-3 text-center shadow-soft">
            <p className="text-[11px] text-muted-foreground">قسط ماهانه</p>
            <p className="num mt-1 text-sm font-extrabold">{moneyText(installment)}</p>
          </div>
        </div>
        {gap > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-destructive-soft px-3 py-2 text-xs font-bold text-destructive">
            <TriangleAlert className="h-4 w-4" /> شکاف ماهانه {moneyText(gap)}
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-extrabold">مسیر چندساله</span>
            <span className="text-[11px] text-muted-foreground">سناریو: فرض تعدیل نرخ {fa(TARIFF_GROWTH * 100)}٪ سالانه</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {years.map((c, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-[11px]"><span>سال {fa(i + 1)}</span><span className="num font-bold">{fa(c)}٪</span></div>
                <Meter value={c} max={100} tone={c >= 100 ? "ink" : "sun"} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <SunPanel className="mt-6 space-y-3">
        <PanelTitle hint="سه راهکار">چه کار کنم؟</PanelTitle>
        {ways.map((w, i) => (
          <button key={w.title} type="button" onClick={w.run} className="ink-card flex w-full items-center gap-3 p-3.5 text-right">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-ink-foreground">{fa(i + 1)}</span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold">{w.title}</span>
              <span className="block text-[11px] text-muted-foreground">{w.text}</span>
            </span>
            <ChevronLeft className="h-4 w-4" />
          </button>
        ))}
        <Button variant="ink" size="xl" className="w-full" disabled={busy} onClick={() => save(principal, months)}>
          {busy ? "در حال ذخیره…" : principal > 0 ? "ادامه با این وام" : "ادامه با پرداخت نقدی"}
        </Button>
        <p className="text-center text-[11px] opacity-70">
          {principal > 0 ? <>وام: {money(principal).value} {money(principal).unit}، {fa(months)} ماه</> : "بدون وام"} — <Pill tone="ink">برآورد</Pill>
        </p>
      </SunPanel>
    </>
  );
}
