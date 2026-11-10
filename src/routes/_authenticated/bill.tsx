import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PanelTitle, Pill, ScreenHeader, StepBar, SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { billQuery, currentUserId } from "@/lib/queries";
import { toNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bill")({
  head: () => ({ meta: [{ title: "تأیید اطلاعات قبض | اکوسولار" }, { name: "description", content: "ثبت و تأیید اطلاعات قبض برق برای تحلیل مصرف." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(billQuery),
  component: BillPage,
});

const FIELDS = [
  { key: "bill_number", label: "شناسه قبض", placeholder: "مثلاً ۷۸۱۰۲۳۳۲۱۹۰۳۶۵", numeric: false, unit: "" },
  { key: "period_label", label: "دوره صورتحساب", placeholder: "مثلاً مرداد تا مهر ۱۴۰۵", numeric: false, unit: "" },
  { key: "peak_kwh", label: "مصرف اوج", placeholder: "۰", numeric: true, unit: "kWh" },
  { key: "mid_kwh", label: "مصرف میان‌باری", placeholder: "۰", numeric: true, unit: "kWh" },
  { key: "offpeak_kwh", label: "مصرف کم‌باری", placeholder: "۰", numeric: true, unit: "kWh" },
  { key: "amount_rial", label: "مبلغ کل قبض", placeholder: "۰", numeric: true, unit: "ریال" },
] as const;

type Key = (typeof FIELDS)[number]["key"];

function BillPage() {
  const { data: bill } = useSuspenseQuery(billQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<Key, string>>({
    bill_number: bill?.bill_number ?? "",
    period_label: bill?.period_label ?? "",
    peak_kwh: bill ? String(bill.peak_kwh) : "",
    mid_kwh: bill ? String(bill.mid_kwh) : "",
    offpeak_kwh: bill ? String(bill.offpeak_kwh) : "",
    amount_rial: bill ? String(bill.amount_rial) : "",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nums = {
      peak_kwh: toNumber(values.peak_kwh || "0"),
      mid_kwh: toNumber(values.mid_kwh || "0"),
      offpeak_kwh: toNumber(values.offpeak_kwh || "0"),
      amount_rial: toNumber(values.amount_rial || "0"),
    };
    if (Object.values(nums).some((n) => Number.isNaN(n) || n < 0)) return toast.error("مقادیر عددی را درست وارد کنید");
    if (nums.peak_kwh + nums.mid_kwh + nums.offpeak_kwh <= 0) return toast.error("حداقل یکی از مصرف‌ها باید بیشتر از صفر باشد");
    if (!values.bill_number.trim() || !values.period_label.trim()) return toast.error("شناسه قبض و دوره را وارد کنید");

    setBusy(true);
    try {
      const payload = { ...nums, bill_number: values.bill_number.trim(), period_label: values.period_label.trim() };
      const { error } = bill
        ? await supabase.from("bills").update(payload).eq("id", bill.id)
        : await supabase.from("bills").insert({ ...payload, user_id: await currentUserId() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["bill"] });
      toast.success("قبض ثبت شد");
      navigate({ to: "/optimize" });
    } catch {
      toast.error("ذخیره قبض انجام نشد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ScreenHeader title="تأیید اطلاعات قبض" subtitle="مرحله ۱ از ۴" />
      <StepBar total={4} current={1} />
      <div className="px-5 py-5">
        <div className="ink-card relative flex h-36 items-center justify-center overflow-hidden shadow-soft">
          <div className="absolute inset-6 rounded-xl border-2 border-dashed border-primary-deep/60" />
          <ReceiptText className="h-14 w-14 text-primary-deep" strokeWidth={1.4} />
          <div className="absolute top-3 left-3">
            <Pill tone="success">● ورود دستی</Pill>
          </div>
        </div>
      </div>

      <SunPanel className="flex-1">
        <form onSubmit={submit}>
          <PanelTitle>داده‌های قبض</PanelTitle>
          <p className="-mt-2 mb-3 text-xs opacity-75">هر مقدار را بررسی کنید؛ تحلیل مصرف و طراحی نیروگاه بر همین داده‌ها انجام می‌شود.</p>
          <div className="ink-card divide-y divide-border px-4">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-3 py-3 text-sm">
                <span className="w-28 shrink-0 text-muted-foreground">{f.label}</span>
                <input
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  inputMode={f.numeric ? "decimal" : "text"}
                  placeholder={f.placeholder}
                  className="num min-w-0 flex-1 bg-transparent text-left font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
                  dir={f.numeric ? "ltr" : "rtl"}
                />
                {f.unit && <span className="text-[11px] text-muted-foreground">{f.unit}</span>}
                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <Button type="submit" variant="ink" size="xl" className="flex-1" disabled={busy}>
              {busy ? "در حال ذخیره…" : "تأیید و ادامه"}
            </Button>
          </div>
          <p className="mt-3 text-center text-[11px] opacity-70">هر اصلاح با شماره بازبینی ذخیره می‌شود و نسخه قبلی حفظ می‌شود.</p>
        </form>
      </SunPanel>
    </>
  );
}
