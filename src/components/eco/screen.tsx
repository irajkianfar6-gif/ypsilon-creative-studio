import { Link, useRouter } from "@tanstack/react-router";
import { Bell, ChevronRight, House, Sun, FileText, ChartColumn, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Phone-sized frame: full screen on phones, a centred device on larger screens. */
export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-canvas sm:flex sm:items-center sm:justify-center sm:py-8">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background sm:min-h-0 sm:h-[860px] sm:rounded-[3rem] sm:shadow-phone">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back = true,
  leading,
}: {
  title: string;
  subtitle?: string | undefined;
  back?: boolean;
  leading?: ReactNode | undefined;
}) {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-6 pb-3">
      <div className="w-10">
        {back ? (
          <button
            type="button"
            aria-label="بازگشت"
            onClick={() => router.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          leading
        )}
      </div>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-lg font-extrabold">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="w-10">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 left-2.5 h-2 w-2 rounded-full bg-destructive" />
        </span>
      </div>
    </header>
  );
}

export function SunPanel({ children, className }: { children: ReactNode; className?: string }) {
  // The spacer pushes the yellow sheet to the bottom when content is short.
  return (
    <>
      <div aria-hidden className="min-h-6 flex-1" />
      <section className={cn("sun-panel px-5 pt-6 pb-6 animate-rise", className)}>{children}</section>
    </>
  );
}

export function PanelTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-lg font-extrabold">{children}</h2>
      {hint && <span className="text-xs opacity-70">{hint}</span>}
    </div>
  );
}

export function InfoRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary-foreground/10 py-2.5 text-sm last:border-0">
      <span className="opacity-75">{label}</span>
      <span className="num font-bold">{value}</span>
    </div>
  );
}

export function Pill({
  children,
  tone = "sun",
}: {
  children: ReactNode;
  tone?: "sun" | "success" | "warning" | "muted" | "ink" | "danger";
}) {
  const tones = {
    sun: "bg-primary-soft text-accent-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    muted: "bg-muted text-muted-foreground",
    ink: "bg-ink text-ink-foreground",
    danger: "bg-destructive-soft text-destructive",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

export function BigStat({ value, unit, label }: { value: ReactNode; unit?: ReactNode; label?: ReactNode }) {
  return (
    <div>
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <p className="mt-1 flex items-baseline gap-2">
        <span className="num text-5xl font-black tracking-tight">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

const NAV = [
  { to: "/home", icon: House, label: "خانه" },
  { to: "/design", icon: Sun, label: "طراحی" },
  { to: "/plant", icon: FileText, label: "پرونده" },
  { to: "/revenue", icon: ChartColumn, label: "درآمد" },
  { to: "/profile", icon: User, label: "پروفایل" },
] as const;

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 bg-primary px-5 pb-5 pt-2">
      <ul className="flex items-center justify-between rounded-full bg-primary-deep/40 p-1.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <Link
              to={to}
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground transition-colors"
              activeProps={{ className: "bg-card shadow-soft" }}
            >
              <Icon className="h-5 w-5" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function StepBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5 px-5" aria-label={`مرحله ${current} از ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("h-1 flex-1 rounded-full", i < current ? "bg-ink" : "bg-border")}
        />
      ))}
    </div>
  );
}
