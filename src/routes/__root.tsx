import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { PhoneShell } from "@/components/eco/screen";

function NotFoundComponent() {
  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-7xl font-black">۴۰۴</h1>
        <h2 className="mt-4 text-xl font-bold">این صفحه پیدا نشد</h2>
        <p className="mt-2 text-sm text-muted-foreground">صفحه‌ای که دنبالش هستید وجود ندارد یا جابه‌جا شده است.</p>
        <Link to="/" className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-bold text-ink-foreground">
          بازگشت به خانه
        </Link>
      </div>
    </PhoneShell>
  );
}

// After an update, an open tab can still point at page files that no longer exist.
// Reload once to pick up the new version instead of showing a blank screen.
const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const RELOAD_KEY = "eco-chunk-reload";

function reloadForStaleChunk(message: string) {
  if (typeof window === "undefined" || !CHUNK_ERROR.test(message)) return false;
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - last < 10_000) return false; // avoid reload loops
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
  return true;
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const message = error instanceof Error ? error.message : String(error ?? "");
  const stale = CHUNK_ERROR.test(message);
  useEffect(() => {
    if (reloadForStaleChunk(message)) return;
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error, message]);

  if (stale) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="text-xl font-bold">نسخه تازه اپ آماده است</h1>
          <p className="mt-2 text-sm text-muted-foreground">برای ادامه صفحه را دوباره بارگذاری کنید.</p>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-bold text-ink-foreground">
            بارگذاری دوباره
          </button>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold">این صفحه بارگذاری نشد</h1>
        <p className="mt-2 text-sm text-muted-foreground">مشکلی پیش آمد. دوباره تلاش کنید یا به خانه برگردید.</p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-ink-foreground"
          >
            تلاش دوباره
          </button>
          <a href="/" className="rounded-full bg-card px-5 py-3 text-sm font-bold shadow-soft">
            خانه
          </a>
        </div>
      </div>
    </PhoneShell>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#F3C33B" },
      { title: "اکوسولار | مدیریت هوشمند انرژی خورشیدی" },
      {
        name: "description",
        content: "اکوسولار: از قبض برق تا نیروگاه خورشیدی خانگی، خرید تضمینی و صورتحساب درآمد — پایلوت استان اصفهان.",
      },
      { property: "og:title", content: "اکوسولار | مدیریت هوشمند انرژی خورشیدی" },
      { property: "og:description", content: "مسیر کامل نیروگاه خورشیدی خانگی و درآمد برق در یک اپ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;800;900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const onPreloadError = (e: Event) => {
      const err = (e as Event & { payload?: unknown }).payload;
      if (reloadForStaleChunk(err instanceof Error ? err.message : "Failed to fetch dynamically imported module")) e.preventDefault();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason ?? "");
      if (reloadForStaleChunk(msg)) e.preventDefault();
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <PhoneShell>
        <Outlet />
      </PhoneShell>
      <Toaster position="top-center" dir="rtl" />
    </QueryClientProvider>
  );
}
