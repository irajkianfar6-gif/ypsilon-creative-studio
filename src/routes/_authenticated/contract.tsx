import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Cpu, FileSignature, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, InfoRow, PanelTitle, Pill, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { EmptyStep } from "@/components/eco/empty";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { consentsQuery, persianDate, plantQuery, profileQuery, ratesQuery } from "@/lib/queries";
import { nextStep, rateFor } from "@/lib/flow";
import { missingRequired } from "@/lib/consents";
import { annualRevenue } from "@/lib/solar";
import { fa, faDigits, moneyText } from "@/lib/format";
import { maskIban } from "@/lib/identity";

export const Route = createFileRoute("/_authenticated/contract")({
  head: () => ({
    meta: [
      { title: "قرارداد کانال و اتصال دستگاه | اکوسولار" },
      { name: "description", content: "مطالعه و امضای قرارداد فروش برق و ثبت اینورتر برای فعال‌سازی پایش." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(plantQuery),
      context.queryClient.ensureQueryData(ratesQuery),
      context.queryClient.ensureQueryData(profileQuery),
      context.queryClient.ensureQueryData(consentsQuery),
    ]),
  component: Contract,
});

function Contract() {
  const { data: plant } = useSuspenseQuery(plantQuery);
  const { data: rates } = useSuspenseQuery(ratesQuery);
  const { data: me } = useSuspenseQuery(profileQuery);
  const { data: consents } = useSuspenseQuery(consentsQuery);
  const qc = useQueryClient();
  const [agree, setAgree] = useState(false);
  const [serial, setSerial] = useState(plant?.inverter_serial ?? "");
  const [dongle, setDongle] = useState(plant?.dongle_id ?? "");
  const [busy, setBusy] = useState(false);

  if (!plant || !plant.channel) {
    const step = nextStep(true, plant) ?? { to: "/channels" as const, label: "انتخاب کانال درآمد" };
    return (
      <>
        <ScreenHeader title="قرارداد کانال" />
        <EmptyStep step={step} title="ابتدا کانال درآمد را انتخاب کنید" text="متن قرارداد بر اساس کانال انتخابی و آخرین نسخه جدول نرخ ساخته می‌شود." />
      </>
    );
  }

  const rate = rateFor(rates, plant.channel);
  const signed = !!plant.contract_signed_at;
  const profile = me?.profile;
  const kycDone = !!profile?.kyc_submitted_at;
  const missing = missingRequired(consents);
  const rateChanged = signed && rate && plant.contract_version && plant.contract_version !== rate.version;
  const months = (rate?.contract_years ?? 0) * 12;

  async function sign() {
    if (!rate || !plant) return;
    setBusy(true);
    const { error } = await supabase
      .from("plants")
      .update({ contract_signed_at: new Date().toISOString(), contract_version: rate.version })
      .eq("id", plant.id)
      .is("contract_signed_at", null);
    setBusy(false);
    if (error) { toast.error("امضا ثبت نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["plant"] });
    await qc.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("قرارداد امضا شد و نسخه آن قفل شد");
  }

  async function saveDevice() {
    if (!plant) return;
    if (serial.trim().length < 6) { toast.error("سریال اینورتر را از برچسب روی دستگاه کامل وارد کنید"); return; }
    setBusy(true);
    const { error } = await supabase
      .from("plants")
      .update({ inverter_serial: serial.trim().toUpperCase(), dongle_id: dongle.trim().toUpperCase() || null })
      .eq("id", plant.id);
    setBusy(false);
    if (error) { toast.error("ثبت دستگاه انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["plant"] });
    toast.success("اینورتر ثبت شد");
  }

  return (
    <>
      <ScreenHeader title="قرارداد کانال" subtitle={rate ? `نسخه نرخ: ${rate.version}` : undefined} />
      <div className="space-y-3 px-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">کانال قرارداد</p>
            <p className="text-2xl font-black">{rate?.title ?? plant.channel}</p>
          </div>
          {signed ? <Pill tone="success"><Lock className="h-3 w-3" /> امضا و قفل شده</Pill> : <Pill tone="warning">در انتظار امضا</Pill>}
        </div>

        {rateChanged && (
          <div className="flex items-start gap-2 rounded-2xl bg-warning-soft p-3 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            جدول نرخ به نسخه «{rate?.version}» به‌روز شده؛ قرارداد شما با نسخه «{plant.contract_version}» قفل است و تغییر نمی‌کند.
          </div>
        )}

        <article className="max-h-72 space-y-2 overflow-y-auto rounded-3xl bg-card p-4 text-xs leading-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <FileSignature className="h-4 w-4" /> قرارداد استاندارد {rate?.title}
          </h2>
          <p>
            <b>طرفین:</b> {profile?.full_name || "مالک نیروگاه"} (فروشنده) و {plant.channel === "self" ? "مصرف در محل انشعاب" : "سازمان ساتبا (خریدار)"}.
          </p>
          <p>
            <b>موضوع:</b> فروش برق تولیدی نیروگاه خورشیدی {fa(Number(plant.capacity_kw), 1)} کیلوواتی با کد رهگیری مهرسان {faDigits(plant.tracking_code)} در {plant.city}.
          </p>
          {rate && (
            <p>
              <b>نرخ و مدت:</b> {fa(Number(rate.rate_rial_per_kwh))} ریال به ازای هر کیلووات‌ساعت، به مدت {fa(months)} ماه ({fa(rate.contract_years)} سال)، بر پایه جدول نرخ نسخه «{rate.version}».
              {rate.condition ? ` شرط کانال: ${rate.condition}.` : ""}
            </p>
          )}
          <p>
            <b>مبنای صورتحساب:</b> فقط قرائت کنتور دوطرفه رسمی شرکت توزیع؛ داده اینورتر برای پایش و تطبیق است.
          </p>
          <p>
            <b>پرداخت:</b> {rate?.settlement_delay ? `معمولاً ${rate.settlement_delay} پس از صدور صورتحساب، ` : ""}مستقیم به شبای {faDigits(maskIban(profile?.iban))}. اکوسولار وجه را نگه نمی‌دارد.
          </p>
          <p>
            <b>قیدها:</b> خودتأمین و خرید تضمینی روی یک انشعاب هم‌زمان مجاز نیست. شارژ باتری از شبکه و فروش آن با نرخ باتری‌دار ممنوع است. پس از امضا، نسخه قرارداد قفل می‌شود.
          </p>
          {rate && <p className="text-muted-foreground">برآورد درآمد سال اول: {moneyText(annualRevenue(Number(plant.annual_kwh), Number(rate.rate_rial_per_kwh)))}</p>}
        </article>
      </div>

      <SunPanel className="space-y-3">
        {signed ? (
          <>
            <PanelTitle>امضای قرارداد</PanelTitle>
            <div>
              <InfoRow label="تاریخ امضا" value={persianDate(plant.contract_signed_at!)} />
              <InfoRow label="نسخه قفل‌شده" value={plant.contract_version ?? "—"} />
              <InfoRow label="مدت" value={`${fa(months)} ماه`} />
            </div>
          </>
        ) : (
          <>
            <PanelTitle>امضای دیجیتال</PanelTitle>
            {!kycDone && (
              <Link to="/kyc" className="ink-card flex items-center justify-between p-3 text-xs font-bold">
                ابتدا هویت و شبا را ثبت کنید <Pill tone="warning">لازم</Pill>
              </Link>
            )}
            {missing.length > 0 && (
              <Link to="/consents" className="ink-card flex items-center justify-between p-3 text-xs font-bold">
                رضایت اشتراک داده با {missing.map((m) => m.name).join(" و ")} <Pill tone="warning">لازم</Pill>
              </Link>
            )}
            <label className="flex items-center gap-3 text-sm font-bold">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="border-primary-foreground" />
              متن قرارداد و قیدها را خواندم و می‌پذیرم
            </label>
            <Button variant="ink" size="xl" className="w-full" disabled={busy || !agree || !kycDone || missing.length > 0 || !rate} onClick={sign}>
              {busy ? "در حال ثبت…" : "امضای قرارداد"}
            </Button>
          </>
        )}

        <PanelTitle hint={plant.inverter_serial ? "ثبت شده" : "ثبت نشده"}>
          <span className="flex items-center gap-2"><Cpu className="h-5 w-5" /> اتصال دستگاه</span>
        </PanelTitle>
        <Input aria-label="سریال اینورتر" placeholder={`سریال اینورتر ${plant.inverter}`} dir="ltr" value={serial} onChange={(e) => setSerial(e.target.value)} className="h-12 rounded-2xl border-0 bg-card text-right" />
        <Input aria-label="شناسه دانگل" placeholder="شناسه دانگل وای‌فای (اختیاری)" dir="ltr" value={dongle} onChange={(e) => setDongle(e.target.value)} className="h-12 rounded-2xl border-0 bg-card text-right" />
        <Button variant="soft" size="xl" className="w-full" disabled={busy} onClick={saveDevice}>
          {plant.inverter_serial ? "به‌روزرسانی دستگاه" : "ثبت دستگاه"}
        </Button>
        <p className="text-[11px] opacity-75">پس از نصب، پایش تولید با همین سریال فعال می‌شود. اتصال مستقیم به اینورتر در نسخه پایلوت هنوز برقرار نیست.</p>
      </SunPanel>
      <BottomNav />
    </>
  );
}
