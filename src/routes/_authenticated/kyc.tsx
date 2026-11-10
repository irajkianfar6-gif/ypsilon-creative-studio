import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BadgeCheck, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, InfoRow, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { persianDate, profileQuery } from "@/lib/queries";
import { bankFromIban, isValidIban, isValidNationalId, maskIban, maskNationalId, normalizeIban } from "@/lib/identity";
import { asciiDigits, faDigits } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({
    meta: [
      { title: "هویت و حساب بانکی | اکوسولار" },
      { name: "description", content: "ثبت کد ملی، تاریخ تولد و شبای مالک برای قرارداد و واریز درآمد." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  component: Kyc,
});

const field = "h-12 rounded-2xl border-0 bg-card";

function Kyc() {
  const { data } = useSuspenseQuery(profileQuery);
  const p = data?.profile;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(!p?.kyc_submitted_at);
  const [name, setName] = useState(p?.full_name ?? "");
  const [nid, setNid] = useState(p?.national_id ? faDigits(p.national_id) : "");
  const [birth, setBirth] = useState(p?.birth_date ? faDigits(p.birth_date) : "");
  const [iban, setIban] = useState(p?.iban ? faDigits(p.iban.slice(2)) : "");
  const [holder, setHolder] = useState(p?.account_holder ?? "");
  const [busy, setBusy] = useState(false);

  const ibanReady = asciiDigits(iban).replace(/\D/g, "").length >= 24;
  const bank = ibanReady ? bankFromIban(iban) : null;
  const birthOk = /^1[34]\d{2}\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/.test(asciiDigits(birth).trim());

  async function save(e: FormEvent) {
    e.preventDefault();
    const problem =
      name.trim().length < 3 ? "نام و نام خانوادگی را کامل وارد کنید"
      : !isValidNationalId(nid) ? "کد ملی معتبر نیست؛ ۱۰ رقم را دوباره بررسی کنید"
      : !birthOk ? "تاریخ تولد را به شکل ۱۳۶۵/۰۴/۱۲ وارد کنید"
      : !isValidIban(iban) ? "شماره شبا معتبر نیست؛ ۲۴ رقم بعد از IR را بررسی کنید"
      : holder.trim().length < 3 ? "نام صاحب حساب را وارد کنید"
      : null;
    if (problem) { toast.error(problem); return; }
    if (p?.iban && normalizeIban(iban) !== p.iban && !window.confirm("شبای مقصد واریز درآمد تغییر می‌کند. ادامه می‌دهید؟")) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return; }
    const { error } = await supabase.from("profiles").upsert({
      id: u.user.id,
      full_name: name.trim(),
      national_id: asciiDigits(nid).replace(/\D/g, ""),
      birth_date: asciiDigits(birth).trim(),
      iban: normalizeIban(iban),
      account_holder: holder.trim(),
      kyc_submitted_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) { toast.error("ذخیره انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("اطلاعات هویتی و حساب ثبت شد");
    setEditing(false);
  }

  return (
    <>
      <ScreenHeader title="هویت و حساب بانکی" subtitle="شخص حقیقی" />
      <div className="px-5">
        <div className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
          <BadgeCheck className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-extrabold">وضعیت احراز هویت</p>
            <p className="text-[11px] text-muted-foreground">
              {p?.kyc_submitted_at ? `ثبت شده در ${persianDate(p.kyc_submitted_at)}` : "برای امضای قرارداد و واریز درآمد لازم است"}
            </p>
          </div>
          {p?.kyc_submitted_at ? <Pill tone="warning">در انتظار استعلام</Pill> : <Pill tone="muted">تکمیل نشده</Pill>}
        </div>
      </div>

      <SunPanel className="space-y-3">
        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <PanelTitle>اطلاعات هویتی</PanelTitle>
            <Input aria-label="نام و نام خانوادگی" placeholder="نام و نام خانوادگی" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            <Input aria-label="کد ملی" placeholder="کد ملی ۱۰ رقمی" inputMode="numeric" dir="ltr" value={nid} onChange={(e) => setNid(faDigits(asciiDigits(e.target.value).replace(/\D/g, "").slice(0, 10)))} className={`${field} text-right`} />
            <Input aria-label="تاریخ تولد" placeholder="تاریخ تولد، مثلاً ۱۳۶۵/۰۴/۱۲" inputMode="numeric" dir="ltr" value={birth} onChange={(e) => setBirth(faDigits(asciiDigits(e.target.value).replace(/[^\d/]/g, "").slice(0, 10)))} className={`${field} text-right`} />

            <PanelTitle hint={bank ?? undefined}>حساب بانکی مقصد واریز</PanelTitle>
            <div className="flex h-12 items-center gap-2 rounded-2xl bg-card px-3" dir="ltr">
              <span className="text-sm font-bold">IR</span>
              <input
                aria-label="شماره شبا"
                placeholder="۲۴ رقم شبا"
                inputMode="numeric"
                value={iban}
                onChange={(e) => setIban(faDigits(asciiDigits(e.target.value).toUpperCase().replace(/^IR/, "").replace(/\D/g, "").slice(0, 24)))}
                className="num h-full flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {ibanReady && !isValidIban(iban) && <p className="text-xs font-bold text-destructive">شبا معتبر نیست</p>}
            <Input aria-label="نام صاحب حساب" placeholder="نام صاحب حساب" value={holder} onChange={(e) => setHolder(e.target.value)} className={field} />
            <p className="text-[11px] opacity-75">شبا باید به نام مالک نیروگاه باشد. درآمد مستقیم به همین حساب واریز می‌شود؛ اکوسولار وجه را نگه نمی‌دارد.</p>
            <Button type="submit" variant="ink" size="xl" className="w-full" disabled={busy}>
              {busy ? "در حال ثبت…" : "ثبت و ارسال برای استعلام"}
            </Button>
          </form>
        ) : (
          <>
            <PanelTitle>اطلاعات ثبت‌شده</PanelTitle>
            <div>
              <InfoRow label="نام" value={p?.full_name ?? "—"} />
              <InfoRow label="کد ملی" value={faDigits(maskNationalId(p?.national_id))} />
              <InfoRow label="تاریخ تولد" value={faDigits(p?.birth_date ?? "—")} />
              <InfoRow label={<span className="flex items-center gap-1"><Landmark className="h-4 w-4" /> شبا</span>} value={<span dir="ltr">{faDigits(maskIban(p?.iban))}</span>} />
              <InfoRow label="بانک" value={bankFromIban(p?.iban ?? "") ?? "—"} />
              <InfoRow label="صاحب حساب" value={p?.account_holder ?? "—"} />
            </div>
            <div className="flex gap-3">
              <Button variant="ink" size="xl" className="flex-1" onClick={() => navigate({ to: "/contract" })}>
                ادامه به قرارداد
              </Button>
              <Button variant="soft" size="xl" onClick={() => setEditing(true)}>
                ویرایش
              </Button>
            </div>
          </>
        )}
      </SunPanel>
      <BottomNav />
    </>
  );
}
