import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, InfoRow, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { plantQuery, settlementsQuery, type Settlement } from "@/lib/queries";
import { nextStep } from "@/lib/flow";
import { fa, money, moneyText } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/revenue")({
  head: () => ({ meta: [{ title: "درآمد و صورتحساب | اکوسولار" }, { name: "description", content: "صورتحساب ماهانه خرید تضمینی مبتنی بر کنتور رسمی." }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(settlementsQuery), context.queryClient.ensureQueryData(plantQuery)]),
  component: Revenue,
});

const STATUS: Record<string, { label: string; tone: "warning" | "success" | "danger" }> = {
  pending: { label: "صادر شده", tone: "warning" },
  confirmed: { label: "دریافت شد", tone: "success" },
  disputed: { label: "مغایرت ثبت شد", tone: "danger" },
};

function Revenue() {
  const { data: list } = useSuspenseQuery(settlementsQuery);
  const { data: plant } = useSuspenseQuery(plantQuery);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | undefined>(list[0]?.id);
  const [dispute, setDispute] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const s: Settlement | undefined = list.find((x) => x.id === selectedId) ?? list[0];

  if (!s) {
    const step = nextStep(true, plant) ?? { to: "/plant" as const, label: "پرونده نیروگاه" };
    return (
      <>
        <ScreenHeader title="درآمد" back={false} />
        <EmptyStep step={step} title="هنوز صورتحسابی صادر نشده" text="پس از شروع بهره‌برداری، صورتحساب ماهانه بر مبنای کنتور رسمی توزیع این‌جا صادر می‌شود." />
        <div className="mt-auto"><BottomNav /></div>
      </>
    );
  }

  const m = money(Number(s.amount_rial));
  const energy = Number(s.energy_kwh);
  const inverter = Number(s.inverter_kwh);
  const diff = inverter > 0 ? Math.abs(inverter - energy) / inverter : 0;
  const bars = [
    { label: "اینورتر", sub: "پایش", v: inverter, cls: "bg-primary" },
    { label: "کنتور توزیع", sub: "مرجع", v: energy, cls: "bg-primary-deep" },
    { label: "مبنای صورتحساب", sub: "قطعی", v: energy, cls: "bg-ink" },
  ];
  const max = Math.max(...bars.map((b) => b.v), 1);

  async function update(status: "confirmed" | "disputed", dispute_note?: string) {
    setBusy(true);
    const { error } = await supabase.from("settlements").update({ status, dispute_note: dispute_note ?? null }).eq("id", s!.id);
    setBusy(false);
    if (error) return toast.error("ثبت انجام نشد");
    await qc.invalidateQueries({ queryKey: ["settlements"] });
    toast.success(status === "confirmed" ? "دریافت وجه تأیید شد" : "گزارش مغایرت ثبت شد؛ کارشناس بررسی می‌کند");
    setDispute(false);
    setNote("");
  }

  return (
    <>
      <ScreenHeader title={`درآمد ${s.period_label}`} subtitle="صورتحساب خرید تضمینی" back={false} />
      <div className="px-5">
        <p className="text-xs text-muted-foreground">مبلغ قابل دریافت از ساتبا</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="flex items-baseline gap-2">
            <span className="num text-5xl font-black">{m.value}</span>
            <span className="text-sm text-muted-foreground">{m.unit}</span>
          </p>
          <Pill tone={STATUS[s.status]?.tone ?? "warning"}>{STATUS[s.status]?.label ?? s.status}</Pill>
        </div>
        <div className="mt-2">
          <Pill>مبنا: کنتور رسمی توزیع {fa(energy)} kWh</Pill>
        </div>

        <div className="mt-6 flex h-44 items-end justify-around gap-4">
          {bars.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="num text-xs font-bold">{fa(b.v)}</span>
              <div className={cn("w-full rounded-2xl", b.cls)} style={{ height: `${(b.v / max) * 120}px` }} />
              <span className="text-[11px] font-bold">{b.label}</span>
              <span className="text-[10px] text-muted-foreground">{b.sub}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <Pill tone={diff <= 0.03 ? "success" : "danger"}>
            {diff <= 0.03 ? <CheckCircle2 className="h-3 w-3" /> : null}
            اختلاف {fa(diff * 100, 1)}٪ {diff <= 0.03 ? "در محدوده مجاز؛ انرژی قفل شد" : "خارج از محدوده؛ بررسی لازم است"}
          </Pill>
        </div>

        {list.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
            {list.map((x) => (
              <button key={x.id} type="button" onClick={() => setSelectedId(x.id)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", x.id === s.id ? "bg-ink text-ink-foreground" : "bg-card shadow-soft")}>
                {x.period_label}
              </button>
            ))}
          </div>
        )}
      </div>

      <SunPanel className="mt-6 space-y-3 pb-3">
        <PanelTitle hint={<Pill tone="ink">{STATUS[s.status]?.label}</Pill>}>صورتحساب</PanelTitle>
        <div>
          <InfoRow label="مبنا انرژی" value={`${fa(energy)} kWh`} />
          <InfoRow label="نرخ قرارداد" value={`${fa(Number(s.rate_rial))} ریال`} />
          <InfoRow label="مبلغ ناخالص" value={moneyText(Number(s.amount_rial))} />
          <InfoRow label="تاریخ صدور" value={new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(new Date(s.created_at))} />
        </div>
        <div className="ink-card flex items-center gap-2 p-3 text-xs text-accent-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          زمان واریز معمولاً ۲ تا ۳ ماه پس از صدور است
        </div>
        {s.status === "disputed" && s.dispute_note && <p className="text-xs opacity-80">یادداشت مغایرت: {s.dispute_note}</p>}
        {s.status === "pending" && (
          <div className="flex gap-3">
            <Button variant="ink" size="xl" className="flex-1" disabled={busy} onClick={() => update("confirmed")}>
              تأیید دریافت وجه
            </Button>
            <Button variant="soft" size="xl" disabled={busy} onClick={() => setDispute(true)}>
              گزارش مغایرت
            </Button>
          </div>
        )}
        <p className="text-center text-[11px] opacity-70">واریز مستقیم به شبای مالک؛ اکوسولار وجه را نگه نمی‌دارد.</p>
      </SunPanel>
      <BottomNav />

      <Dialog open={dispute} onOpenChange={setDispute}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-right">گزارش مغایرت صورتحساب</DialogTitle>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً عدد کنتور با قرائت من فرق دارد…" rows={4} />
          <Button variant="ink" size="xl" disabled={busy || note.trim().length < 5} onClick={() => update("disputed", note.trim())}>
            ثبت گزارش
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
