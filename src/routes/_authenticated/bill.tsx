import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Pencil, ReceiptText, ScanLine, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PanelTitle, Pill, ScreenHeader, StepBar, SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { billQuery, currentUserId } from "@/lib/queries";
import { fa, faDigits, toNumber } from "@/lib/format";
import { photoToDataUrl } from "@/lib/image";
import { extractBillFromImage, type BillExtraction, type BillField } from "@/lib/bill-ocr.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bill")({
  head: () => ({ meta: [{ title: "تأیید اطلاعات قبض | اکوسولار" }, { name: "description", content: "خواندن خودکار قبض برق از عکس و تأیید اطلاعات پیش از ذخیره." }] }),
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
] as const satisfies ReadonlyArray<{ key: BillField; label: string; placeholder: string; numeric: boolean; unit: string }>;

/** Below this, a field is flagged for the user to double-check. */
const LOW_CONFIDENCE = 0.8;

function BillPage() {
  const { data: bill } = useSuspenseQuery(billQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const extract = useServerFn(extractBillFromImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [scan, setScan] = useState<BillExtraction | null>(null);
  const [edited, setEdited] = useState<Partial<Record<BillField, boolean>>>({});
  const [values, setValues] = useState<Record<BillField, string>>({
    bill_number: faDigits(bill?.bill_number ?? ""),
    period_label: bill?.period_label ?? "",
    peak_kwh: bill ? fa(Number(bill.peak_kwh), 2) : "",
    mid_kwh: bill ? fa(Number(bill.mid_kwh), 2) : "",
    offpeak_kwh: bill ? fa(Number(bill.offpeak_kwh), 2) : "",
    amount_rial: bill ? fa(Number(bill.amount_rial)) : "",
  });

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک عکس انتخاب کنید");
      return;
    }
    setReading(true);
    setScan(null);
    try {
      const dataUrl = await photoToDataUrl(file);
      setPhoto(dataUrl);
      const res = await extract({ data: { image: dataUrl } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (!res.data.is_bill) {
        toast.error("این عکس قبض برق به نظر نمی‌رسد. عکس واضح‌تری از قبض بگیرید.");
        return;
      }
      const v = res.data.values;
      setValues((prev) => {
        const next = { ...prev };
        for (const f of FIELDS) {
          const val = v[f.key];
          if (val !== null && val !== undefined && String(val).trim() !== "") {
            next[f.key] = f.numeric && typeof val === "number" ? fa(val, 2) : faDigits(String(val));
          }
        }
        return next;
      });
      setEdited({});
      setScan(res.data);
    } catch {
      toast.error("خواندن عکس انجام نشد. دوباره تلاش کنید یا دستی وارد کنید.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nums = {
      peak_kwh: toNumber(values.peak_kwh || "0"),
      mid_kwh: toNumber(values.mid_kwh || "0"),
      offpeak_kwh: toNumber(values.offpeak_kwh || "0"),
      amount_rial: toNumber(values.amount_rial || "0"),
    };
    if (Object.values(nums).some((n) => Number.isNaN(n) || n < 0)) { toast.error("مقادیر عددی را درست وارد کنید"); return; }
    if (nums.peak_kwh + nums.mid_kwh + nums.offpeak_kwh <= 0) { toast.error("حداقل یکی از مصرف‌ها باید بیشتر از صفر باشد"); return; }
    if (!values.bill_number.trim() || !values.period_label.trim()) { toast.error("شناسه قبض و دوره را وارد کنید"); return; }

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

  const flagged = scan ? FIELDS.filter((f) => !edited[f.key] && (scan.confidence[f.key] ?? 0) < LOW_CONFIDENCE) : [];

  return (
    <>
      <ScreenHeader title="تأیید اطلاعات قبض" subtitle="مرحله ۱ از ۴" />
      <StepBar total={4} current={1} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0])}
        aria-label="عکس قبض"
      />

      <div className="px-5 py-5">
        <div className="ink-card relative flex h-44 items-center justify-center overflow-hidden shadow-soft">
          {photo ? (
            <img src={photo} alt="عکس قبض شما" className={cn("h-full w-full object-cover", reading && "opacity-40")} />
          ) : (
            <>
              <div className="absolute inset-6 rounded-xl border-2 border-dashed border-primary-deep/60" />
              <ReceiptText className="h-14 w-14 text-primary-deep" strokeWidth={1.4} />
            </>
          )}

          {reading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/60">
              <ScanLine className="h-10 w-10 animate-pulse text-primary-deep" />
              <span className="text-sm font-bold">در حال خواندن قبض…</span>
            </div>
          )}

          <div className="absolute top-3 left-3">
            {scan ? (
              <Pill tone={scan.overall_confidence >= LOW_CONFIDENCE ? "success" : "warning"}>
                ● اطمینان استخراج {fa(Math.round(scan.overall_confidence * 100))}٪
              </Pill>
            ) : (
              <Pill tone="muted">{photo ? "عکس قبض" : "ورود دستی یا عکس"}</Pill>
            )}
          </div>

          <button
            type="button"
            disabled={reading}
            onClick={() => fileRef.current?.click()}
            className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-bold text-ink-foreground shadow-soft disabled:opacity-50"
          >
            {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {photo ? "عکس مجدد" : "عکس قبض"}
          </button>
        </div>
      </div>

      <SunPanel>
        <form onSubmit={submit}>
          <PanelTitle>{scan ? "داده‌های استخراج‌شده" : "داده‌های قبض"}</PanelTitle>
          <p className="-mt-2 mb-3 text-xs leading-6 opacity-75">
            {scan
              ? "این مقادیر از عکس خوانده شد و هنوز ذخیره نشده است. هر مقدار را با قبض مقایسه کنید؛ پس از تأیید شما ذخیره می‌شود."
              : "از قبض عکس بگیرید یا مقادیر را دستی وارد کنید؛ تحلیل مصرف و طراحی نیروگاه بر همین داده‌ها انجام می‌شود."}
          </p>

          {scan && (flagged.length > 0 || scan.note) && (
            <div className="mb-3 flex items-start gap-2 rounded-2xl bg-warning-soft p-3 text-xs leading-6 text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {flagged.length > 0 && <>{fa(flagged.length)} مقدار با اطمینان پایین خوانده شد؛ آن‌ها را بررسی کنید. </>}
                {scan.note}
              </span>
            </div>
          )}

          <div className="ink-card divide-y divide-border px-4">
            {FIELDS.map((f) => {
              const conf = scan?.confidence[f.key];
              const low = !!scan && !edited[f.key] && (conf ?? 0) < LOW_CONFIDENCE;
              return (
                <label key={f.key} className={cn("-mx-4 flex items-center gap-3 px-4 py-3 text-sm", low && "bg-warning-soft")}>
                  <span className="w-28 shrink-0 text-muted-foreground">
                    {f.label}
                    {low && <span className="block text-[10px] font-bold text-warning">اطمینان پایین</span>}
                  </span>
                  <input
                    value={values[f.key]}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [f.key]: e.target.value }));
                      setEdited((x) => ({ ...x, [f.key]: true }));
                    }}
                    inputMode={f.numeric ? "decimal" : "text"}
                    placeholder={f.placeholder}
                    className="num min-w-0 flex-1 bg-transparent text-left font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
                    dir={f.numeric ? "ltr" : "rtl"}
                  />
                  {f.unit && <span className="text-[11px] text-muted-foreground">{f.unit}</span>}
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </label>
              );
            })}
          </div>
          <div className="mt-5 flex gap-3">
            <Button type="submit" variant="ink" size="xl" className="flex-1" disabled={busy || reading}>
              {busy ? "در حال ذخیره…" : "تأیید و ذخیره"}
            </Button>
          </div>
          <p className="mt-3 text-center text-[11px] opacity-70">عکس قبض فقط برای خواندن استفاده می‌شود و ذخیره نمی‌شود.</p>
        </form>
      </SunPanel>
    </>
  );
}
