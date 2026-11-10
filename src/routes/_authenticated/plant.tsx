import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { plantQuery, ratesQuery } from "@/lib/queries";
import { issueSettlement, nextStep, rateFor } from "@/lib/flow";
import { OPERATIONAL_STAGE, PERMIT_STAGES } from "@/lib/solar";
import { fa, faDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/plant")({
  head: () => ({ meta: [{ title: "پرونده نیروگاه | اکوسولار" }, { name: "description", content: "مرحله‌نمای مجوز مهرسان و مراحل نصب پیمانکار." }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(plantQuery), context.queryClient.ensureQueryData(ratesQuery)]),
  component: PlantFile,
});

const INSTALL = ["تحویل تجهیزات", "نصب سازه", "نصب پنل", "سیم‌کشی", "راه‌اندازی"];

function PlantFile() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const { data: rates } = useSuspenseQuery(ratesQuery);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!plant || !plant.supplier) {
    const step = nextStep(true, plant) ?? { to: "/design" as const, label: "طرح نیروگاه" };
    return (
      <>
        <ScreenHeader title="پرونده نیروگاه" back={false} />
        <EmptyStep step={step} title="هنوز پرونده‌ای تشکیل نشده" text="پس از انتخاب پیش‌فاکتور و ثبت سفارش، پرونده مهرسان تشکیل و این‌جا پیگیری می‌شود." />
        <div className="mt-auto"><BottomNav /></div>
      </>
    );
  }

  const done = plant.stage;
  const operational = done >= OPERATIONAL_STAGE;
  const installDone = done >= 5 ? INSTALL.length : done === 4 ? 2 : 0;
  const current = PERMIT_STAGES[Math.min(done, PERMIT_STAGES.length - 1)]!;

  async function advance() {
    if (!plant || operational) return;
    setBusy(true);
    try {
      const next = plant.stage + 1;
      const { error } = await supabase.from("plants").update({ stage: next }).eq("id", plant.id);
      if (error) throw error;
      if (next >= OPERATIONAL_STAGE) {
        const rate = rateFor(rates, plant.channel);
        if (rate) await issueSettlement({ ...plant, stage: next }, rate);
        toast.success("نیروگاه شما به بهره‌برداری رسید! اولین صورتحساب صادر شد");
      } else {
        toast.success(`مرحله «${PERMIT_STAGES[plant.stage]?.title ?? ""}» تکمیل شد`);
      }
      await qc.invalidateQueries({ queryKey: ["plant"] });
      await qc.invalidateQueries({ queryKey: ["settlements"] });
    } catch {
      toast.error("به‌روزرسانی انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ScreenHeader title="پرونده نیروگاه" subtitle={`کد رهگیری مهرسان ${faDigits(plant.tracking_code)}`} back={false} />
      <div className="px-5">
        <p className="text-xs text-muted-foreground">مرحله جاری</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="flex items-baseline gap-2">
            <span className="num text-5xl font-black">{fa(Math.min(done + 1, PERMIT_STAGES.length))}</span>
            <span className="text-sm text-muted-foreground">از {fa(PERMIT_STAGES.length)}</span>
          </p>
          {operational ? <Pill tone="success">● در حال بهره‌برداری</Pill> : <Pill tone="warning">● در انتظار {current.title}</Pill>}
        </div>

        <ol className="mt-5 space-y-0">
          {PERMIT_STAGES.map((s, i) => {
            const state = i < done ? "done" : i === done ? "current" : "todo";
            return (
              <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
                {i < PERMIT_STAGES.length - 1 && (
                  <span className={cn("absolute top-6 right-[11px] h-full w-0.5", i < done ? "bg-ink" : "bg-border")} />
                )}
                <span
                  className={cn(
                    "relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                    state === "done" && "border-ink bg-ink text-ink-foreground",
                    state === "current" && "border-primary-deep bg-primary-soft",
                    state === "todo" && "border-border bg-background",
                  )}
                >
                  {state === "done" ? <Check className="h-3.5 w-3.5" /> : state === "current" ? <span className="h-2 w-2 rounded-full bg-primary-deep" /> : null}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-bold", state === "todo" && "text-muted-foreground")}>{s.title}</span>
                    {state === "current" && <Pill>جاری</Pill>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{state === "done" ? "تکمیل شد" : s.note}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <SunPanel className="space-y-3 pb-3">
        <PanelTitle hint={`${fa(installDone)} از ${fa(INSTALL.length)}`}>مراحل نصب پیمانکار</PanelTitle>
        <div className="grid grid-cols-5 gap-1.5">
          {INSTALL.map((t, i) => (
            <div key={t} className="space-y-1">
              <div className={cn("h-1.5 rounded-full", i < installDone ? "bg-ink" : "bg-card")} />
              <p className="truncate text-center text-[9px] opacity-80">{t}</p>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] opacity-75">
          <Camera className="h-3.5 w-3.5" /> هر مرحله با عکس زمان‌دار و موقعیت محل تأیید می‌شود
        </p>
        {!operational && (
          <div className="ink-card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
              <Clock className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold">{current.title}</span>
              <span className="block text-[11px] text-muted-foreground">{current.note}</span>
            </span>
          </div>
        )}
        {!operational && (
          <Button variant="soft" size="xl" className="w-full" disabled={busy} onClick={advance}>
            {busy ? "در حال ثبت…" : "ثبت تکمیل این مرحله (پایلوت)"}
          </Button>
        )}
      </SunPanel>
      <BottomNav />
    </>
  );
}
