import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MailCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SunLogo } from "@/components/eco/logo";
import { SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ورود به اکوسولار" },
      { name: "description", content: "ورود یا ثبت‌نام در اکوسولار برای مدیریت نیروگاه خورشیدی و درآمد برق." },
      { property: "og:title", content: "ورود به اکوسولار" },
      { property: "og:description", content: "ورود یا ثبت‌نام در اکوسولار." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!agree) { toast.error("برای ادامه، شرایط و رضایت‌نامه را بپذیرید"); return; }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/home", data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/home", replace: true });
        else setSent(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("Invalid login") ? "ایمیل یا رمز عبور درست نیست" : msg.includes("already") ? "این ایمیل قبلاً ثبت شده است" : msg.includes("invalid") ? "این ایمیل معتبر نیست" : "ورود انجام نشد. دوباره تلاش کنید",
      );
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("ورود با گوگل انجام نشد"); return; }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-col items-center px-6 pt-12 pb-8 text-center">
        <SunLogo className="h-24 w-24 shadow-soft" />
        <h1 className="mt-4 text-3xl font-black">اکوسولار</h1>
        <p className="mt-1 text-sm text-muted-foreground">مدیریت هوشمند انرژی خورشیدی شما</p>
      </div>

      <SunPanel className="space-y-4">
        {sent ? (
          <div className="ink-card space-y-3 p-6 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary-deep" />
            <h2 className="text-lg font-extrabold">ایمیل تأیید ارسال شد</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              پیوند تأیید را در صندوق {email} باز کنید تا حساب شما فعال شود. پوشه هرزنامه را هم بررسی کنید.
            </p>
            <Button variant="ink" className="w-full" size="xl" onClick={() => { setSent(false); setMode("in"); }}>
              بازگشت به ورود
            </Button>
          </div>
        ) : (
          <>
            <div className="flex rounded-full bg-primary-deep/30 p-1">
              {(["in", "up"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn("flex-1 rounded-full py-2.5 text-sm font-bold transition", mode === m && "bg-card shadow-soft")}
                >
                  {m === "in" ? "ورود" : "ثبت‌نام"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "up" && (
                <Input required placeholder="نام و نام خانوادگی" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-2xl border-0 bg-card" />
              )}
              <Input required type="email" dir="ltr" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-2xl border-0 bg-card text-right" />
              <Input required type="password" dir="ltr" minLength={6} placeholder="رمز عبور (حداقل ۶ کاراکتر)" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-2xl border-0 bg-card text-right" />

              {mode === "up" && (
                <label className="ink-card flex items-start gap-3 p-4 text-xs leading-6">
                  <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-1" />
                  <span>با شرایط استفاده و رضایت‌نامه‌های اشتراک داده قبض و انشعاب برق موافقم.</span>
                </label>
              )}

              <Button type="submit" variant="ink" size="xl" className="w-full" disabled={busy}>
                {busy ? "در حال بررسی…" : mode === "in" ? "ورود" : "ساخت حساب"}
              </Button>
            </form>

            <div className="flex items-center gap-3 text-xs opacity-70">
              <span className="h-px flex-1 bg-primary-foreground/20" />
              یا
              <span className="h-px flex-1 bg-primary-foreground/20" />
            </div>

            <Button type="button" variant="soft" size="xl" className="w-full font-medium" onClick={google}>
              <GoogleIcon />
              ادامه با گوگل
            </Button>

            <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] opacity-70">
              <ShieldCheck className="h-3.5 w-3.5" />
              داده‌ها فقط در سرورهای داخل کشور نگهداری می‌شود
            </p>
          </>
        )}
      </SunPanel>
    </div>
  );
}
