import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SunLogo } from "@/components/eco/logo";
import { SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "اکوسولار | نیروگاه خورشیدی خانگی و درآمد برق" },
      {
        name: "description",
        content: "قبض برق‌تان را ثبت کنید، نیروگاه خورشیدی مناسب خانه‌تان را ببینید و درآمد خرید تضمینی را پیگیری کنید.",
      },
      { property: "og:title", content: "اکوسولار | نیروگاه خورشیدی خانگی و درآمد برق" },
      { property: "og:description", content: "از قبض برق تا صورتحساب درآمد، همه در یک اپ — پایلوت اصفهان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-16 pb-10 text-center">
        <SunLogo className="h-32 w-32 shadow-soft" />
        <h1 className="mt-6 text-4xl font-black">اکوسولار</h1>
        <p className="mt-2 text-sm text-muted-foreground">مدیریت هوشمند انرژی خورشیدی شما</p>
      </div>
      <SunPanel className="space-y-5">
        <div>
          <h2 className="text-xl font-extrabold">بام شما، نیروگاه شما</h2>
          <p className="mt-2 text-sm leading-7 opacity-80">
            قبض برق را ثبت کنید؛ اکوسولار ظرفیت مناسب، کانال درآمد، وام و پیش‌فاکتور را برایتان آماده می‌کند و
            پرونده تا شروع بهره‌برداری پیگیری می‌شود.
          </p>
        </div>
        <Button asChild variant="ink" size="xl" className="w-full">
          <Link to={signedIn ? "/home" : "/auth"}>{signedIn ? "ادامه" : "ورود و شروع"}</Link>
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] opacity-70">
          <ShieldCheck className="h-3.5 w-3.5" />
          داده‌ها فقط در سرورهای داخل کشور نگهداری می‌شود
        </p>
      </SunPanel>
    </div>
  );
}
