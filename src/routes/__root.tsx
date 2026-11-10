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

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

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
