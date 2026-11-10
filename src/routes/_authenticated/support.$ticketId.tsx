import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { currentUserId, persianDate, ticketQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/support/$ticketId")({
  head: () => ({
    meta: [
      { title: "گفتگوی تیکت | اکوسولار" },
      { name: "description", content: "پیام‌های تیکت پشتیبانی و وضعیت پیگیری." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(ticketQuery(params.ticketId)),
  component: TicketThread,
});

const STATUS: Record<string, string> = { open: "باز", review: "در بررسی", referred: "ارجاع شد", closed: "بسته" };

function TicketThread() {
  const { ticketId } = Route.useParams();
  const { data } = useSuspenseQuery(ticketQuery(ticketId));
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const t = data.ticket;

  if (!t) {
    return (
      <>
        <ScreenHeader title="تیکت" />
        <p className="flex-1 p-8 text-center text-sm text-muted-foreground">این تیکت پیدا نشد.</p>
        <BottomNav />
      </>
    );
  }

  const closed = t.status === "closed";
  const bubbles = [
    { id: "desc", author: "user", body: t.description, created_at: t.created_at },
    ...data.messages,
  ].filter((m) => m.body);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (text.trim().length < 2) return;
    setBusy(true);
    try {
      const user_id = await currentUserId();
      const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, user_id, body: text.trim() });
      if (error) throw error;
      setText("");
      await qc.invalidateQueries({ queryKey: ["tickets", ticketId] });
    } catch {
      toast.error("ارسال پیام انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    const { error } = await supabase.from("tickets").update({ status: "closed" }).eq("id", ticketId);
    if (error) { toast.error("بستن تیکت انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["tickets"] });
    toast.success("تیکت بسته شد");
  }

  return (
    <>
      <ScreenHeader title={t.subject} subtitle={`وضعیت: ${STATUS[t.status] ?? t.status}`} />
      <div className="flex-1 space-y-3 px-5 pb-4">
        {bubbles.map((m) => (
          <div key={m.id} className={cn("flex", m.author === "user" ? "justify-start" : "justify-end")}>
            <div className={cn("max-w-[85%] rounded-3xl p-3 text-sm leading-6 shadow-soft", m.author === "user" ? "bg-card" : "bg-primary-soft")}>
              {m.author === "support" && <Pill tone="ink">پشتیبانی</Pill>}
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{persianDate(m.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
      <SunPanel className="space-y-3">
        {closed ? (
          <p className="text-center text-sm font-bold">این تیکت بسته شده است.</p>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <Textarea aria-label="پیام" placeholder="پیام شما" rows={3} value={text} onChange={(e) => setText(e.target.value)} className="rounded-2xl border-0 bg-card" />
            <div className="flex gap-3">
              <Button type="submit" variant="ink" size="xl" className="flex-1" disabled={busy || text.trim().length < 2}>
                ارسال
              </Button>
              <Button type="button" variant="soft" size="xl" onClick={close}>
                بستن تیکت
              </Button>
            </div>
          </form>
        )}
      </SunPanel>
      <BottomNav />
    </>
  );
}
