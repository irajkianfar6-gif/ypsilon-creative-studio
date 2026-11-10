import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { consentsQuery, currentUserId, persianDate } from "@/lib/queries";
import { CONSENT_PARTNERS, isGranted } from "@/lib/consents";

export const Route = createFileRoute("/_authenticated/consents")({
  head: () => ({
    meta: [
      { title: "رضایت‌نامه‌های اشتراک داده | اکوسولار" },
      { name: "description", content: "اجازه اشتراک داده با شرکت توزیع، ساتبا، بانک و پرداخت‌یار را بدهید یا ابطال کنید." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(consentsQuery),
  component: Consents,
});

type Partner = (typeof CONSENT_PARTNERS)[number];

function Consents() {
  const { data: list } = useSuspenseQuery(consentsQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState<Partner | null>(null);
  const [revoke, setRevoke] = useState<Partner | null>(null);
  const [busy, setBusy] = useState(false);
  const active = CONSENT_PARTNERS.filter((p) => isGranted(list, p.id)).length;

  async function grant(p: Partner) {
    setBusy(true);
    try {
      const user_id = await currentUserId();
      const { error } = await supabase
        .from("consents")
        .upsert({ user_id, partner: p.id, granted_at: new Date().toISOString(), revoked_at: null }, { onConflict: "user_id,partner" });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["consents"] });
      toast.success(`رضایت برای «${p.name}» ثبت شد`);
      setOpen(null);
    } catch {
      toast.error("ثبت رضایت انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  async function doRevoke(p: Partner) {
    setBusy(true);
    const { error } = await supabase.from("consents").update({ revoked_at: new Date().toISOString() }).eq("partner", p.id);
    setBusy(false);
    if (error) { toast.error("ابطال انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["consents"] });
    toast.success("رضایت ابطال شد");
    setRevoke(null);
  }

  return (
    <>
      <ScreenHeader title="رضایت‌نامه‌ها" subtitle="اشتراک داده با شرکا" />
      <div className="px-5">
        <div className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
          <ShieldCheck className="h-8 w-8 shrink-0" />
          <p className="text-xs leading-6 text-muted-foreground">
            اکوسولار فقط با رضایت صریح شما داده را با هر شریک به اشتراک می‌گذارد. هر رضایت را هر زمان می‌توانید ابطال کنید.
          </p>
        </div>
      </div>

      <SunPanel className="space-y-3">
        <PanelTitle hint={`${new Intl.NumberFormat("fa-IR").format(active)} از ${new Intl.NumberFormat("fa-IR").format(CONSENT_PARTNERS.length)} فعال`}>
          فهرست رضایت‌ها
        </PanelTitle>
        {CONSENT_PARTNERS.map((p) => {
          const row = list.find((c) => c.partner === p.id);
          const on = isGranted(list, p.id);
          return (
            <div key={p.id} className="ink-card space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-extrabold">{p.name}</span>
                {on ? <Pill tone="success">فعال</Pill> : p.required ? <Pill tone="warning">لازم برای قرارداد</Pill> : <Pill tone="muted">اختیاری</Pill>}
              </div>
              <p className="text-[11px] text-muted-foreground">داده: {p.scope}</p>
              {on && row && <p className="text-[11px] text-muted-foreground">امضا در {persianDate(row.granted_at)}</p>}
              <div className="flex gap-2">
                <Button variant={on ? "soft" : "ink"} size="sm" className="flex-1" onClick={() => setOpen(p)}>
                  {on ? "مشاهده متن" : "مطالعه و امضا"}
                </Button>
                {on && (
                  <Button variant="ghost" size="sm" onClick={() => setRevoke(p)}>
                    ابطال
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </SunPanel>
      <BottomNav />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-right">رضایت اشتراک داده</DialogTitle>
            <DialogDescription className="text-right">{open?.name}</DialogDescription>
          </DialogHeader>
          {open && (
            <div className="space-y-2 text-sm leading-7">
              <p>
                اینجانب اجازه می‌دهم اکوسولار داده‌های زیر را صرفاً برای هدف ذکرشده در اختیار «{open.name}» قرار دهد:
              </p>
              <p className="rounded-2xl bg-muted p-3 text-xs">
                <b>دامنه داده:</b> {open.scope}
                <br />
                <b>هدف:</b> {open.purpose}
              </p>
              <p className="text-xs text-muted-foreground">
                این رضایت با زمان و نسخه ثبت می‌شود و هر زمان از همین صفحه قابل ابطال است. ابطال، اشتراک‌های بعدی را متوقف می‌کند.
              </p>
              {!isGranted(list, open.id) && (
                <Button variant="ink" size="xl" className="w-full" disabled={busy} onClick={() => grant(open)}>
                  {busy ? "در حال ثبت…" : "می‌پذیرم و امضا می‌کنم"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!revoke} onOpenChange={(v) => !v && setRevoke(null)}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-right">ابطال رضایت</DialogTitle>
            <DialogDescription className="text-right">{revoke?.name}</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-7">
            {revoke?.required
              ? "با ابطال این رضایت، صدور صورتحساب و پیگیری پرونده متوقف می‌شود تا دوباره رضایت دهید."
              : "پس از ابطال، این شریک داده جدیدی از حساب شما دریافت نمی‌کند."}
          </p>
          <Button variant="ink" size="xl" disabled={busy} onClick={() => revoke && doRevoke(revoke)}>
            ابطال رضایت
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
