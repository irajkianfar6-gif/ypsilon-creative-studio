import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ChevronLeft, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { currentUserId, persianDate, plantQuery, ticketsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/support/")({
  head: () => ({
    meta: [
      { title: "پشتیبانی | اکوسولار" },
      { name: "description", content: "ثبت تیکت پشتیبانی فنی، مالی و پرونده نیروگاه و پیگیری پاسخ‌ها." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(ticketsQuery), context.queryClient.ensureQueryData(plantQuery)]),
  component: Support,
});

export const TOPICS = { technical: "فنی", financial: "مالی", case: "پرونده", other: "سایر" } as const;
export const TICKET_STATUS: Record<string, { label: string; tone: "warning" | "sun" | "muted" | "success" }> = {
  open: { label: "باز", tone: "warning" },
  review: { label: "در بررسی", tone: "sun" },
  referred: { label: "ارجاع شد", tone: "sun" },
  closed: { label: "بسته", tone: "muted" },
};
type Topic = keyof typeof TOPICS;

function Support() {
  const { data: tickets } = useSuspenseQuery(ticketsQuery);
  const { data: plant } = useSuspenseQuery(plantQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic>("technical");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 3 || description.trim().length < 5) {
      toast.error("موضوع و شرح درخواست را کامل بنویسید");
      return;
    }
    setBusy(true);
    try {
      const user_id = await currentUserId();
      const { data, error } = await supabase
        .from("tickets")
        .insert({ user_id, topic, subject: subject.trim(), description: description.trim(), plant_id: plant?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["tickets"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("تیکت ثبت شد");
      navigate({ to: "/support/$ticketId", params: { ticketId: data.id } });
    } catch {
      toast.error("ثبت تیکت انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ScreenHeader title="پشتیبانی" subtitle="تیکت‌های شما" />
      <div className="space-y-2 px-5 pb-2">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl bg-card p-6 text-center text-xs text-muted-foreground shadow-soft">
            <LifeBuoy className="h-8 w-8" />
            <p className="mt-2">هنوز تیکتی ثبت نکرده‌اید</p>
          </div>
        ) : (
          tickets.map((t) => {
            const s = TICKET_STATUS[t.status] ?? { label: t.status, tone: "muted" as const };
            return (
              <Link key={t.id} to="/support/$ticketId" params={{ ticketId: t.id }} className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{t.subject}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {TOPICS[t.topic as Topic] ?? t.topic} | {persianDate(t.updated_at)}
                  </span>
                </span>
                <Pill tone={s.tone}>{s.label}</Pill>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            );
          })
        )}
      </div>

      <SunPanel className="space-y-3">
        <PanelTitle>تیکت جدید</PanelTitle>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(TOPICS) as Topic[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={topic === id}
                onClick={() => setTopic(id)}
                className={cn("rounded-2xl py-2.5 text-xs font-bold", topic === id ? "bg-ink text-ink-foreground" : "bg-card")}
              >
                {TOPICS[id]}
              </button>
            ))}
          </div>
          <Input aria-label="موضوع" placeholder="موضوع" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-12 rounded-2xl border-0 bg-card" />
          <Textarea aria-label="شرح" placeholder="شرح درخواست" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-2xl border-0 bg-card" />
          <Button type="submit" variant="ink" size="xl" className="w-full" disabled={busy}>
            {busy ? "در حال ارسال…" : "ارسال تیکت"}
          </Button>
        </form>
      </SunPanel>
      <BottomNav />
    </>
  );
}
