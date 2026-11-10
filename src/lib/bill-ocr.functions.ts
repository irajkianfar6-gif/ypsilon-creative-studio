import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillField = "bill_number" | "period_label" | "peak_kwh" | "mid_kwh" | "offpeak_kwh" | "amount_rial";

export interface BillExtraction {
  is_bill: boolean;
  values: Record<BillField, string | number | null>;
  confidence: Record<BillField, number>;
  overall_confidence: number;
  note: string;
}

export type BillOcrResult = { ok: true; data: BillExtraction } | { ok: false; error: string };

const MAX_DATA_URL = 8_000_000;

const fieldConfidence = {
  type: "object",
  additionalProperties: false,
  required: ["bill_number", "period_label", "peak_kwh", "mid_kwh", "offpeak_kwh", "amount_rial"],
  properties: {
    bill_number: { type: "number" },
    period_label: { type: "number" },
    peak_kwh: { type: "number" },
    mid_kwh: { type: "number" },
    offpeak_kwh: { type: "number" },
    amount_rial: { type: "number" },
  },
} as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_bill", "values", "confidence", "overall_confidence", "note"],
  properties: {
    is_bill: { type: "boolean", description: "true only if the image is an Iranian electricity bill" },
    values: {
      type: "object",
      additionalProperties: false,
      required: ["bill_number", "period_label", "peak_kwh", "mid_kwh", "offpeak_kwh", "amount_rial"],
      properties: {
        bill_number: { type: ["string", "null"], description: "شناسه قبض, ASCII digits only" },
        period_label: { type: ["string", "null"], description: "Billing period in Persian, e.g. 'مرداد تا مهر ۱۴۰۵'" },
        peak_kwh: { type: ["number", "null"], description: "مصرف اوج بار in kWh" },
        mid_kwh: { type: ["number", "null"], description: "مصرف میان باری / عادی in kWh" },
        offpeak_kwh: { type: ["number", "null"], description: "مصرف کم باری in kWh" },
        amount_rial: { type: ["number", "null"], description: "مبلغ قابل پرداخت in RIAL" },
      },
    },
    confidence: fieldConfidence,
    overall_confidence: { type: "number" },
    note: { type: "string", description: "Short Persian note about anything unreadable; empty if none" },
  },
} as const;

const PROMPT = `You read photos of Iranian electricity bills (قبض برق، شرکت توزیع نیروی برق).
Extract: شناسه قبض, the billing period (از تاریخ ... تا تاریخ, written as Persian month names and year), consumption in kWh for اوج بار (peak), میان باری/عادی (mid) and کم باری (off-peak), and the total payable amount.
Rules:
- Convert Persian/Arabic digits to plain numbers. Remove thousands separators.
- The amount must be in RIAL. If the bill shows تومان, multiply by 10.
- If a value is missing or unreadable, return null and confidence 0 for it. Never guess.
- Confidence is 0..1 per field: how sure you are the value is read correctly.
- If the image is not an electricity bill, set is_bill=false and all values null.
Return JSON matching the schema.`;

function outputText(response: unknown): string {
  const output = (response as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }).output ?? [];
  for (const item of output) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text) return part.text;
    }
  }
  return "";
}

const clamp01 = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export const extractBillFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) => {
    if (typeof input?.image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(input.image)) {
      throw new Error("Invalid image");
    }
    if (input.image.length > MAX_DATA_URL) throw new Error("Image too large");
    return { image: input.image };
  })
  .handler(async ({ data }): Promise<BillOcrResult> => {
    const { generateResponse, GatewayError, PaymentRequiredError, RateLimitError } = await import("@lovable.dev/ai-gateway");
    try {
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        reasoning: { effort: "low" },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: PROMPT },
              { type: "input_image", image_url: data.image, detail: "high" },
            ],
          },
        ],
        text: { format: { type: "json_schema", name: "electricity_bill", strict: true, schema: SCHEMA } },
      });
      const raw = outputText(response);
      if (!raw) return { ok: false, error: "پاسخی از سرویس خواندن قبض دریافت نشد. دوباره تلاش کنید." };
      const parsed = JSON.parse(raw) as BillExtraction;
      const keys: BillField[] = ["bill_number", "period_label", "peak_kwh", "mid_kwh", "offpeak_kwh", "amount_rial"];
      const confidence = Object.fromEntries(keys.map((k) => [k, clamp01(parsed.confidence?.[k])])) as Record<BillField, number>;
      return {
        ok: true,
        data: {
          is_bill: !!parsed.is_bill,
          values: parsed.values,
          confidence,
          overall_confidence: clamp01(parsed.overall_confidence),
          note: typeof parsed.note === "string" ? parsed.note : "",
        },
      };
    } catch (err) {
      if (err instanceof GatewayError) {
        console.error("bill OCR gateway error", err.code, err.httpStatus, err.ids);
        if (err instanceof PaymentRequiredError) return { ok: false, error: "اعتبار سرویس هوش مصنوعی تمام شده است. لطفاً بعداً دوباره امتحان کنید." };
        if (err instanceof RateLimitError) return { ok: false, error: "درخواست‌ها زیاد است؛ چند لحظه بعد دوباره تلاش کنید." };
        return { ok: false, error: "خواندن قبض انجام نشد. دوباره تلاش کنید یا اطلاعات را دستی وارد کنید." };
      }
      console.error("bill OCR failed", err);
      return { ok: false, error: "خواندن قبض انجام نشد. دوباره تلاش کنید یا اطلاعات را دستی وارد کنید." };
    }
  });
