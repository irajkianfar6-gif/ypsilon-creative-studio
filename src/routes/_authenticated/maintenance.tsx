import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bug, Droplets, Plug, RefreshCw, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { persianDate, plantQuery, workOrdersQuery } from "@/lib/queries";
import { nextStep } from "@/lib/flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({
    meta: [
      { title: "سرویس و نگهداری | اکوسولار" },
      { name: "description", content: "درخواست شست‌وشوی پنل، بازرسی برقی و رفع خرابی نیروگاه خورشیدی." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(plantQuery), context.queryClient.ensureQueryData(workOrdersQuery)]),
  component: Maintenance,
});

type Kind = "cleaning" | "inspection" | "firmware" | "fault";
const KINDS: Record<Kind, { label: string; icon: LucideIcon }> = {
  cleaning: { label: "شست‌وشوی پنل", icon: Droplets },
  inspection: { label: "بازرسی برقی", icon: Plug },
  firmware: { label: "بررسی فرم‌افزار", icon: RefreshCw },
  fault: { label: "گزارش خرابی", icon: Bug },
};
const STATUS: Record<string, { label: string; tone: "warning" | "success" | "muted" | "sun" }> = {
  requested: { label: "در انتظار تخصیص نصاب", tone: "warning" },
  scheduled: { label: "زمان‌بندی شد", tone: "sun" },
  done: { label: "انجام شد", tone: "success" },
  cancelled: { label: "لغو شد", tone: "muted" },
};

function Maintenance() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const { data: orders } = useSuspenseQuery(workOrdersQuery);
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("cleaning");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!plant || !plant.supplier) {
    const step = nextStep(true, plant) ?? { to: "/quotes" as const, label: "انتخاب پیش‌فاکتور" };
    return (
      <>
        <ScreenHeader title="سرویس و نگهداری" />
        <EmptyStep step={step} title="پس از نصب نیروگاه" text="وقتی پیمانکار نصب انتخاب شد، می‌توانید سرویس دوره‌ای و رفع خرابی را از این‌جا درخواست کنید." />
      </>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (kind === "fault" && note.trim().length < 5) { toast.error("خرابی را کوتاه شرح دهید"); return; }
    setBusy(true);
    const { error } = await supabase.from("work_orders").insert({
      user_id: plant!.user_id,
      plant_id: plant!.id,
      kind,
      preferred_date: date.trim() || null,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error("ثبت درخواست انجام نشد"); return; }
    setDate("");
    setNote("");
    await qc.invalidateQueries({ queryKey: ["work_orders"] });
    await qc.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("درخواست سرویس ثبت شد");
  }

  async function cancel(id: string) {
    const { error } = await supabase.from("work_orders").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error("لغو انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["work_orders"] });
  }

  return (
    <>
      <ScreenHeader title="سرویس و نگهداری" subtitle={plant.name} />
      <div className="space-y-2 px-5 pb-2">
        <p className="text-xs text-muted-foreground">دستور کارها</p>
        {orders.length === 0 ? (
          <p className="rounded-3xl bg-card p-4 text-center text-xs text-muted-foreground shadow-soft">هنوز درخواستی ثبت نکرده‌اید</p>
        ) : (
          orders.map((o) => {
            const k = KINDS[o.kind as Kind] ?? KINDS.inspection;
            const s = STATUS[o.status] ?? STATUS["requested"]!;
            const Icon = k.icon;
            return (
              <div key={o.id} className="flex items-start gap-3 rounded-3xl bg-card p-4 shadow-soft">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">{k.label}</span>
                    <Pill tone={s.tone}>{s.label}</Pill>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    ثبت {persianDate(o.created_at)}
                    {o.preferred_date ? ` | زمان پیشنهادی: ${o.preferred_date}` : ""}
                  </p>
                  {o.note && <p className="mt-1 text-xs">{o.note}</p>}
                  {o.status === "requested" && (
                    <button type="button" onClick={() => cancel(o.id)} className="mt-1 text-[11px] font-bold text-destructive">
                      لغو درخواست
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <SunPanel className="space-y-3">
        <PanelTitle hint="هزینه پس از بازدید اعلام می‌شود">درخواست جدید</PanelTitle>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(KINDS) as Kind[]).map((id) => {
              const Icon = KINDS[id].icon;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setKind(id)}
                  aria-pressed={kind === id}
                  className={cn("flex items-center gap-2 rounded-2xl p-3 text-xs font-bold", kind === id ? "bg-ink text-ink-foreground" : "bg-card")}
                >
                  <Icon className="h-4 w-4" /> {KINDS[id].label}
                </button>
              );
            })}
          </div>
          <Input aria-label="زمان پیشنهادی" placeholder="زمان پیشنهادی، مثلاً شنبه صبح" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-2xl border-0 bg-card" />
          <Textarea aria-label="توضیح" placeholder={kind === "fault" ? "چه اتفاقی افتاده؟ مثلاً چراغ خطای اینورتر قرمز است" : "توضیح (اختیاری)"} value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="rounded-2xl border-0 bg-card" />
          <Button type="submit" variant="ink" size="xl" className="w-full" disabled={busy}>
            {busy ? "در حال ثبت…" : "ثبت درخواست سرویس"}
          </Button>
        </form>
      </SunPanel>
      <BottomNav />
    </>
  );
}
