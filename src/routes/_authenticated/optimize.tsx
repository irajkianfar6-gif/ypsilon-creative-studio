import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { InfoRow, PanelTitle, Pill, ScreenHeader, StepBar, SunPanel } from "@/components/eco/screen";
import { DualLines } from "@/components/eco/charts";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { billQuery } from "@/lib/queries";
import { PEAK_PLANS, peakSavingsRial } from "@/lib/solar";
import { fa, moneyText } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/optimize")({
  head: () => ({ meta: [{ title: "بهینه‌سازی مصرف | اکوسولار" }, { name: "description", content: "برنامه کاهش مصرف اوج بر اساس قبض و دمای هوا." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(billQuery),
  component: Optimize,
});

// Hourly shapes for a typical Isfahan summer day (0–23h).
const LOAD = [3, 2.6, 2.4, 2.3, 2.4, 2.8, 3.4, 4, 4.6, 5.2, 6, 6.8, 7.6, 8.4, 9.2, 9.6, 9.4, 8.8, 8.2, 8.6, 9, 7.6, 5.6, 4];
const TEMP = [24, 23, 22, 21, 21, 22, 24, 27, 30, 32, 34, 36, 37, 38, 39, 39, 38, 36, 33, 31, 29, 27, 26, 25];

function Optimize() {
  const { data: bill } = useSuspenseQuery(billQuery);
  const navigate = useNavigate();
  const [plan, setPlan] = useState(1);

  if (!bill) {
    return (
      <>
        <ScreenHeader title="بهینه‌سازی مصرف" subtitle="سرویس ۱ | هوش مصنوعی" />
        <EmptyStep step={{ to: "/bill", label: "ثبت قبض برق" }} title="ابتدا قبض را ثبت کنید" text="برنامه کاهش مصرف بر اساس قبض شما ساخته می‌شود." />
      </>
    );
  }

  const pct = PEAK_PLANS[plan];
  const shifted = LOAD.map((v, h) => (h >= 12 && h <= 17 ? v * (1 - pct / 100) : h >= 20 || h <= 6 ? v * (1 + pct / 300) : v));

  return (
    <>
      <ScreenHeader title="بهینه‌سازی مصرف" subtitle="سرویس ۱ | هوش مصنوعی" />
      <StepBar total={4} current={2} />
      <div className="px-5 pt-4">
        <p className="text-xs text-muted-foreground">صرفه‌جویی برآوردی</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="flex items-baseline gap-2">
            <span className="num text-5xl font-black">{fa(pct)}٪</span>
            <span className="text-sm text-muted-foreground">کاهش مصرف اوج</span>
          </p>
          <Pill tone="muted">امروز</Pill>
        </div>
        <div className="mt-2">
          <Pill>سناریو: مبتنی بر پیش‌بینی دمای فردا</Pill>
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded-full bg-primary-deep" /> مصرف پیشنهادی</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded-full bg-muted-foreground/60" /> دمای بیرون</span>
        </div>
        <div className="mt-2">
          <DualLines a={shifted} b={TEMP} peakFrom={12} peakTo={17} />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>۰</span><span>۶</span><span>۱۲</span><span>۱۸</span><span>۲۳</span>
          </div>
        </div>
      </div>

      <SunPanel className="mt-5 space-y-3">
        <PanelTitle hint={<Info className="h-4 w-4" />}>چرا این پیشنهاد؟</PanelTitle>
        <div>
          <InfoRow label="ضریب حساسیت دمایی" value="۰٫۰۷ بر هر درجه" />
          <InfoRow label="منبع دما" value="پیش‌بینی هواشناسی اصفهان" />
          <InfoRow label="تجهیز اصلی" value="کولر گازی" />
          <InfoRow label="صرفه‌جویی هر قبض" value={moneyText(peakSavingsRial({ ...bill, peak_kwh: Number(bill.peak_kwh), mid_kwh: Number(bill.mid_kwh), offpeak_kwh: Number(bill.offpeak_kwh), amount_rial: Number(bill.amount_rial) }, pct))} />
        </div>
        <div className="ink-card num px-4 py-3 text-center text-xs font-bold" dir="ltr">
          E = P × t × (1 + α·|T_amb − T_set|)
        </div>
        <div className="flex gap-3 pt-1">
          <Button
            variant="ink"
            size="xl"
            className="flex-1"
            onClick={() => {
              toast.success(`برنامه کاهش ${fa(pct)}٪ مصرف اوج فعال شد`);
              navigate({ to: "/design" });
            }}
          >
            پذیرش برنامه
          </Button>
          <Button variant="soft" size="xl" onClick={() => setPlan((p) => (p + 1) % PEAK_PLANS.length)}>
            گزینه‌های دیگر
          </Button>
        </div>
        <Link to="/design" className="block text-center text-xs underline opacity-70">
          رد شدن و رفتن به طرح نیروگاه
        </Link>
      </SunPanel>
    </>
  );
}
