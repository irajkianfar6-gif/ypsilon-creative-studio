import { fa } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Vertical bars, rendered right-to-left (first item on the right). */
export function Bars({
  values,
  labels,
  highlight,
  height = 170,
  unit = "kWh",
}: {
  values: number[];
  labels: string[];
  highlight?: number;
  height?: number;
  unit?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }} dir="rtl">
        {values.map((v, i) => {
          const h = Math.max(6, (v / max) * (height - 26));
          const hi = i === highlight;
          return (
            <div key={i} className="relative flex flex-1 flex-col items-center justify-end">
              {hi && (
                <span className="absolute -top-1 whitespace-nowrap rounded-full bg-card px-2 py-0.5 text-[10px] font-bold shadow-soft">
                  {fa(v)} {unit}
                </span>
              )}
              <div
                className={cn("w-full rounded-full transition-all", hi ? "bg-primary-deep" : "bg-primary")}
                style={{ height: h }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 text-[9px] text-muted-foreground" dir="rtl">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 truncate text-center">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Smooth area curve; x runs right-to-left to match RTL reading. */
export function AreaCurve({
  points,
  marker,
  height = 180,
  xLabels,
  markerLabel,
}: {
  points: number[];
  marker?: number;
  height?: number;
  xLabels?: string[];
  markerLabel?: string;
}) {
  const w = 340;
  const h = height;
  const max = Math.max(...points, 0.001);
  const xy = points.map((p, i) => {
    const x = w - (i / (points.length - 1)) * w;
    const y = h - 14 - (p / max) * (h - 40);
    return [x, y] as const;
  });
  const line = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L0,${h - 14} L${w},${h - 14} Z`;
  const m = marker !== undefined ? xy[Math.min(points.length - 1, Math.max(0, marker))] : undefined;
  const peak = xy[points.indexOf(max)];
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="نمودار تولید">
        <path d={area} className="fill-primary/25" />
        <path d={line} className="fill-none stroke-primary-deep" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={peak[0]} x2={peak[0]} y1={peak[1]} y2={h - 14} className="stroke-primary-deep/40" strokeDasharray="3 4" />
        {m && <circle cx={m[0]} cy={m[1]} r={5} className="fill-card stroke-primary-deep" strokeWidth={2.5} />}
        {m && markerLabel && (
          <g>
            <rect x={m[0] - 34} y={m[1] - 30} width={68} height={20} rx={10} className="fill-ink" />
            <text x={m[0]} y={m[1] - 16} textAnchor="middle" className="fill-ink-foreground text-[10px] font-bold">
              {markerLabel}
            </text>
          </g>
        )}
      </svg>
      {xLabels && (
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          {xLabels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Two lines (consumption vs temperature) with a shaded peak window. */
export function DualLines({ a, b, peakFrom, peakTo }: { a: number[]; b: number[]; peakFrom: number; peakTo: number }) {
  const w = 340;
  const h = 170;
  const toPath = (arr: number[]) => {
    const max = Math.max(...arr);
    const min = Math.min(...arr);
    return arr
      .map((v, i) => {
        const x = w - (i / (arr.length - 1)) * w;
        const y = h - 16 - ((v - min) / (max - min || 1)) * (h - 40);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };
  const x1 = w - (peakFrom / (a.length - 1)) * w;
  const x2 = w - (peakTo / (a.length - 1)) * w;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="مصرف و دما">
      <rect x={Math.min(x1, x2)} y={8} width={Math.abs(x2 - x1)} height={h - 24} className="fill-destructive/10" rx={6} />
      <text x={(x1 + x2) / 2} y={22} textAnchor="middle" className="fill-destructive text-[10px] font-bold">
        اوج نرخ
      </text>
      <path d={toPath(b)} className="fill-none stroke-muted-foreground/60" strokeWidth={1.8} />
      <path d={toPath(a)} className="fill-none stroke-primary-deep" strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  );
}

/** Semi-circle gauge. */
export function Gauge({ percent, label }: { percent: number; label: string }) {
  const r = 80;
  const c = Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative mx-auto w-56">
      <svg viewBox="0 0 200 110" className="w-full">
        <path d="M20,100 A80,80 0 0 1 180,100" className="fill-none stroke-border" strokeWidth={14} strokeLinecap="round" />
        <path
          d="M180,100 A80,80 0 0 0 20,100"
          className="fill-none stroke-primary-deep transition-all duration-700"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="num text-5xl font-black">{fa(p)}٪</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function Meter({ value, max, tone = "sun" }: { value: number; max: number; tone?: "sun" | "ink" | "muted" }) {
  const pct = Math.max(2, Math.min(100, (value / (max || 1)) * 100));
  const tones = { sun: "bg-primary-deep", ink: "bg-ink", muted: "bg-muted-foreground/40" } as const;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border">
      <div className={cn("h-full rounded-full transition-all duration-700", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
