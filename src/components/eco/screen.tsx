import { Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronLeft, ChevronRight, House, Sun, FileText, ChartColumn, User, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { notificationsQuery } from "@/lib/queries";

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
        <NotificationBell />
      </div>
    </header>
  );
}

function NotificationBell() {
  const { data } = useQuery({ ...notificationsQuery, staleTime: 30_000 });
  const unread = data?.filter((n) => !n.read_at).length ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label={unread ? `اعلان‌ها، ${unread} خوانده‌نشده` : "اعلان‌ها"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="num absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
          {unread > 9 ? "۹+" : new Intl.NumberFormat("fa-IR").format(unread)}
        </span>
      )}
    </Link>
  );
}

/** Tappable row used on hub screens (plant file, profile). */
export function LinkRow({
  to,
  icon: Icon,
  title,
  hint,
  badge,
}: {
  to: LinkRowTarget;
  icon: LucideIcon;
  title: string;
  hint?: string | undefined;
  badge?: ReactNode;
}) {
  return (
    <Link to={to} className="ink-card flex items-center gap-3 p-4 shadow-soft">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">{title}</span>
        {hint && <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      {badge}
      <ChevronLeft className="h-4 w-4 shrink-0" />
    </Link>
  );
}

type LinkRowTarget =
  | "/bill"
  | "/optimize"
  | "/kyc"
  | "/consents"
  | "/support"
  | "/notifications"
  | "/contract"
  | "/monitoring"
  | "/maintenance"
  | "/installments"
  | "/revenue";

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
