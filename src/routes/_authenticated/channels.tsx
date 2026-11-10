import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InfoRow, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Meter } from "@/components/eco/charts";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { plantQuery, ratesQuery } from "@/lib/queries";
import { annualRevenue } from "@/lib/solar";
import { fa, money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/channels")({
  head: () => ({ meta: [{ title: "کانال فروش برق | اکوسولار" }, { name: "description", content: "مقایسه خرید تضمینی و خودتأمینی و انتخاب کانال درآمد." }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(plantQuery), context.queryClient.ensureQueryData(ratesQuery)]),
  component: Channels,
});

function Channels() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const { data: rates } = useSuspenseQuery(ratesQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const eligible = (ch: string) => ch !== "guaranteed_battery" || !!plant?.has_battery;
  const rows = plant
    ? rates.map((r) => ({ ...r, revenue: annualRevenue(Number(plant.annual_kwh), Number(r.rate_rial_per_kwh)), ok: eligible(r.channel) }))
    : [];
  const best = [...rows].filter((r) => r.ok).sort((a, b) => b.revenue - a.revenue)[0];
  const [selected, setSelected] = useState<string | undefined>(plant?.channel ?? best?.channel);
  const [sensitivity, setSensitivity] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!plant) {
    return (
      <>
        <ScreenHeader title="کانال فروش برق" />
        <EmptyStep step={{ to: "/design", label: "دیدن طرح نیروگاه" }} title="ابتدا طرح نیروگاه را بسازید" text="درآمد هر کانال بر اساس تولید سالانه نیروگاه شما محاسبه می‌شود." />
      </>
    );
  }

  const max = Math.max(...rows.map((r) => r.revenue), 1);
  const sel = rows.find((r) => r.channel === selected) ?? best;
  const top = money(best?.revenue ?? 0);
  const version = rates[0]?.version ?? "";

  async function choose() {
    if (!sel || !sel.ok) return;
    if (plant!.contract_signed_at) {
      if (sel.channel !== plant!.channel) toast.error("قرارداد این کانال امضا شده و قفل است");
      navigate({ to: "/contract" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("plants").update({ channel: sel.channel }).eq("id", plant!.id);
    setBusy(false);
    if (error) { toast.error("ذخیره کانال انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["plant"] });
    navigate({ to: "/financing" });
  }

  return (
    <>
      <ScreenHeader title="کانال فروش برق" subtitle={`نسخه نرخ: ${version}`} />
      <div className="px-5">
        <p className="text-xs text-muted-foreground">بهترین گزینه مجاز برای انشعاب شما</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="flex items-baseline gap-2">
            <span className="num text-5xl font-black">{top.value}</span>
            <span className="text-sm text-muted-foreground">{top.unit} در سال</span>
          </p>
          <Pill tone="muted">۱ سال</Pill>
        </div>

        <div className="mt-5 space-y-4">
          {rows.map((r) => (
            <button
              key={r.channel}
              type="button"
              disabled={!r.ok}
              onClick={() => setSelected(r.channel)}
              className={cn("block w-full rounded-2xl p-3 text-right transition", selected === r.channel ? "bg-primary-soft" : "bg-transparent", !r.ok && "opacity-50")}
            >
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-bold">
                  {r.title}
                  {r.channel === best?.channel && <Pill tone="ink">پیشنهادی</Pill>}
                  {!r.ok && <Pill tone="muted">نیاز به باتری</Pill>}
                </span>
                <span className="num text-xs font-bold">
                  {money(r.revenue * (sensitivity ? 0.9 : 1)).value} {money(r.revenue).unit.replace(" ریال", "")}
                </span>
              </div>
              <Meter value={r.revenue * (sensitivity ? 0.9 : 1)} max={max} tone={r.channel === best?.channel ? "sun" : "muted"} />
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-warning-soft p-3 text-xs leading-6 text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          خرید تضمینی و خودتأمینی روی یک انشعاب ممکن نیست؛ یکی را برای این انشعاب انتخاب کنید.
        </div>
      </div>

      {sel && (
        <SunPanel className="space-y-3">
          <PanelTitle hint={<Eye className="h-4 w-4" />}>جزئیات کانال منتخب</PanelTitle>
          <div>
            <InfoRow label="نرخ قرارداد" value={`${fa(Number(sel.rate_rial_per_kwh))} ریال بر kWh`} />
            <InfoRow label="مدت قرارداد" value={`${fa(sel.contract_years)} سال`} />
            <InfoRow label="تأخیر پرداخت" value={sel.settlement_delay ?? "—"} />
            <InfoRow label="شرط فعال‌سازی" value={sel.condition ?? "—"} />
          </div>
          {sensitivity && <p className="text-xs opacity-80">حساسیت: با ۱۰٪ تولید کمتر (گردوغبار یا سایه)، درآمد سالانه {money(sel.revenue * 0.9).value} {money(sel.revenue).unit} می‌شود.</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ink" size="xl" className="flex-1" disabled={busy || !sel.ok} onClick={choose}>
              {busy ? "در حال ذخیره…" : "انتخاب این کانال"}
            </Button>
            <Button variant="soft" size="xl" onClick={() => setSensitivity((s) => !s)}>
              تحلیل حساسیت
            </Button>
          </div>
          <p className="text-center text-[11px] opacity-70">
            اعداد براساس تولید {fa(Number(plant.annual_kwh))} kWh و نسخه فعلی جدول نرخ است.
          </p>
        </SunPanel>
      )}
    </>
  );
}
