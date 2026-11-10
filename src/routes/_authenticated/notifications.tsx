import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, BellOff, FileCheck2, Wallet, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, Pill, ScreenHeader } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { notificationsQuery, persianDate, type Notice } from "@/lib/queries";
import { faDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "اعلان‌ها | اکوسولار" },
      { name: "description", content: "هشدارهای فنی، مالی و مقرراتی نیروگاه و اقدام‌های لازم." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notificationsQuery),
  component: Notifications,
});

const KINDS = {
  technical: { label: "هشدار فنی", icon: Wrench },
  financial: { label: "مالی", icon: Wallet },
  regulatory: { label: "مقرراتی", icon: FileCheck2 },
  action: { label: "اقدام لازم", icon: AlertTriangle },
} as const;
type Kind = keyof typeof KINDS;

const FILTERS: { id: "all" | Kind; label: string }[] = [
  { id: "all", label: "همه" },
  { id: "action", label: "اقدام لازم" },
  { id: "financial", label: "مالی" },
  { id: "regulatory", label: "مقرراتی" },
  { id: "technical", label: "فنی" },
];

const ROUTES = ["/plant", "/revenue", "/contract", "/maintenance", "/support", "/monitoring", "/home"];

function Notifications() {
  const { data: list } = useSuspenseQuery(notificationsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const shown = filter === "all" ? list : list.filter((n) => n.kind === filter);
  const unread = list.filter((n) => !n.read_at);

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    if (error) { toast.error("به‌روزرسانی انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function open(n: Notice) {
    if (!n.read_at) await markRead([n.id]);
    const link = n.link ?? "";
    if (link.startsWith("/support/")) {
      navigate({ to: "/support/$ticketId", params: { ticketId: link.slice(9) } });
    } else if (ROUTES.includes(link)) {
      navigate({ to: link as "/plant" });
    }
  }

  return (
    <>
      <ScreenHeader title="اعلان‌ها" subtitle={unread.length ? `${faDigits(String(unread.length))} خوانده‌نشده` : "همه خوانده شده"} />
      <div className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", filter === f.id ? "bg-ink text-ink-foreground" : "bg-card shadow-soft")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-2 px-5 pb-6">
        {unread.length > 0 && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => markRead(unread.map((n) => n.id))}>
              علامت‌گذاری همه به‌عنوان خوانده‌شده
            </Button>
          </div>
        )}
        {shown.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <BellOff className="h-10 w-10" />
            <p className="mt-3 text-sm">اعلانی در این دسته نیست</p>
          </div>
        ) : (
          shown.map((n) => {
            const k = KINDS[(n.kind as Kind) in KINDS ? (n.kind as Kind) : "action"];
            const Icon = k.icon;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => open(n)}
                className={cn("flex w-full items-start gap-3 rounded-3xl p-4 text-right shadow-soft", n.read_at ? "bg-card" : "bg-primary-soft")}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-extrabold">{n.title}</span>
                    {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" aria-label="خوانده‌نشده" />}
                  </span>
                  {n.body && <span className="mt-0.5 block text-xs text-muted-foreground">{faDigits(n.body)}</span>}
                  <span className="mt-2 flex items-center gap-2">
                    <Pill tone="muted">{k.label}</Pill>
                    <span className="text-[10px] text-muted-foreground">{persianDate(n.created_at)}</span>
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      <BottomNav />
    </>
  );
}
