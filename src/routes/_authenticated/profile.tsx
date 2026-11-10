import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ChevronLeft, LogOut, ReceiptText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, PanelTitle, ScreenHeader, SunPanel } from "@/components/eco/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "پروفایل | اکوسولار" }, { name: "description", content: "اطلاعات حساب، شماره موبایل و تنظیمات." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  component: Profile,
});

function Profile() {
  const { data } = useSuspenseQuery(profileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(data?.profile?.full_name ?? "");
  const [phone, setPhone] = useState(data?.profile?.phone ?? "");
  const [city, setCity] = useState(data?.profile?.city ?? "اصفهان");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (phone && !/^0?9\d{9}$/.test(phone.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))))) {
      { toast.error("شماره موبایل را درست وارد کنید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)"); return; }
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: u.user.id, full_name: name, phone, city });
    setBusy(false);
    if (error) { toast.error("ذخیره انجام نشد"); return; }
    await qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("اطلاعات ذخیره شد");
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <ScreenHeader title="پروفایل" subtitle={data?.email ?? ""} back={false} />
      <div className="space-y-3 px-5 pb-6">
        <Link to="/bill" className="ink-card flex items-center gap-3 p-4 shadow-soft">
          <ReceiptText className="h-5 w-5" />
          <span className="flex-1 text-sm font-bold">قبض برق و انشعاب</span>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link to="/optimize" className="ink-card flex items-center gap-3 p-4 shadow-soft">
          <Sparkles className="h-5 w-5" />
          <span className="flex-1 text-sm font-bold">برنامه بهینه‌سازی مصرف</span>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>

      <SunPanel className="space-y-3">
        <PanelTitle>اطلاعات حساب</PanelTitle>
        <form onSubmit={save} className="space-y-3">
          <Input placeholder="نام و نام خانوادگی" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-2xl border-0 bg-card" />
          <Input placeholder="شماره موبایل" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-2xl border-0 bg-card text-right" />
          <Input placeholder="شهرستان" value={city} onChange={(e) => setCity(e.target.value)} className="h-12 rounded-2xl border-0 bg-card" />
          <Button type="submit" variant="ink" size="xl" className="w-full" disabled={busy}>
            {busy ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </form>
        <Button variant="soft" size="xl" className="w-full" onClick={signOut}>
          <LogOut /> خروج از حساب
        </Button>
      </SunPanel>
      <BottomNav />
    </>
  );
}
