import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { plantQuery } from "@/lib/queries";
import { quotePrice, SUPPLIERS } from "@/lib/solar";
import { fa, money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quotes")({
  head: () => ({ meta: [{ title: "پیش‌فاکتورهای تجهیزات | اکوسولار" }, { name: "description", content: "مقایسه پیش‌فاکتور تأمین‌کنندگان و ثبت سفارش تجهیزات." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plantQuery),
  component: Quotes,
});

function Quotes() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>(plant?.supplier ?? SUPPLIERS[0].id);
  const [busy, setBusy] = useState(false);

  if (!plant || plant.loan_months === null) {
    return (
      <>
        <ScreenHeader title="پیش‌فاکتورهای تجهیزات" />
        <EmptyStep step={{ to: plant ? "/financing" : "/design", label: plant ? "بررسی وام" : "دیدن طرح نیروگاه" }} title="یک قدم مانده" text="پس از تعیین روش پرداخت، پیش‌فاکتورها نمایش داده می‌شود." />
      </>
    );
  }

  const kw = Number(plant.capacity_kw);
  const offers = SUPPLIERS.map((s) => ({ ...s, price: quotePrice(kw, s.perKw, plant.has_battery), expired: s.expiresInHours <= 0 }));
  const cheapest = Math.min(...offers.filter((o) => !o.expired).map((o) => o.price));
  const c = money(cheapest);
  const ordered = plant.stage > 0;

  async function order() {
    const offer = offers.find((o) => o.id === selected);
    if (!offer || offer.expired) return;
    setBusy(true);
    const { error } = await supabase
      .from("plants")
      .update({ supplier: offer.id, quote_rial: offer.price, stage: Math.max(plant!.stage, 1) })
      .eq("id", plant!.id);
    setBusy(false);
    if (error) { toast.error("ثبت سفارش انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["plant"] });
    toast.success("سفارش ثبت شد و پرونده نیروگاه تشکیل شد");
    navigate({ to: "/plant" });
  }

  return (
    <>
      <ScreenHeader title="پیش‌فاکتورهای تجهیزات" subtitle={`استعلام طرح ${fa(kw, 1)} کیلووات`} />
      <div className="px-5">
        <p className="text-xs text-muted-foreground">کمترین قیمت معتبر</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="flex items-baseline gap-2">
            <span className="num text-5xl font-black">{c.value}</span>
            <span className="text-sm text-muted-foreground">{c.unit}</span>
          </p>
          <Pill tone="muted">مرتب‌سازی: قیمت</Pill>
        </div>
        <div className="mt-2">
          <Pill>{fa(offers.length)} پیش‌فاکتور دریافت شد</Pill>
        </div>
      </div>

      <SunPanel className="space-y-3">
        <PanelTitle hint="اعتبار به دقیقه">مقایسه فهرست تجهیزات</PanelTitle>
        {offers.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={o.expired || ordered}
            onClick={() => setSelected(o.id)}
            className={cn("ink-card block w-full p-4 text-right transition", selected === o.id && !o.expired && "ring-2 ring-ink", o.expired && "opacity-55")}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", selected === o.id && !o.expired ? "border-ink" : "border-muted-foreground/40")}>
                  {selected === o.id && !o.expired && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                </span>
                <span className="text-sm font-extrabold">{o.name}</span>
                <Pill tone="success">گواهی ساتبا</Pill>
              </span>
              <span className="text-xs text-muted-foreground">امتیاز {fa(o.score, 1)}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              پنل {fa(plant.panel_count)} عدد، اینورتر {fa(Math.ceil(kw))} کیلووات، سازه و کابل{plant.has_battery ? "، باتری" : ""}
            </p>
            <div className="mt-3 flex items-center justify-between">
              {o.expired ? <Pill tone="danger">منقضی شده</Pill> : <Pill tone="warning"><Clock className="h-3 w-3" /> اعتبار تا {fa(o.expiresInHours)} ساعت</Pill>}
              <span className={cn("num text-base font-black", o.expired && "line-through")}>{fa(o.price)} ریال</span>
            </div>
          </button>
        ))}
        <p className="flex items-center justify-center gap-1.5 text-[11px] opacity-75">
          <Lock className="h-3.5 w-3.5" /> پرداخت به تأمین‌کننده پس از تأیید فنی انجام می‌شود
        </p>
        <Button variant="ink" size="xl" className="w-full" disabled={busy} onClick={ordered ? () => navigate({ to: "/plant" }) : order}>
          {ordered ? "مشاهده پرونده نیروگاه" : busy ? "در حال ثبت…" : "انتخاب و ثبت سفارش"}
        </Button>
        <p className="text-center text-[11px] opacity-70">پیش‌فاکتور منقضی‌شده به سفارش تبدیل نمی‌شود.</p>
      </SunPanel>
    </>
  );
}
