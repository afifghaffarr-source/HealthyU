import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { supabase } from "@/integrations/supabase/client";
import { calcAge, calcBMI, bmiCategory, calcBMR, calcTDEE, type ActivityLevel } from "@/lib/health";
import { ArrowLeft, LogOut, Settings, Trophy, Moon, Calendar, Pill, MoonStar, BarChart3, Bell, Users, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const fetchProfile = useServerFn(getProfile);
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const bmi = p?.height_cm && p?.weight_kg ? calcBMI(Number(p.weight_kg), Number(p.height_cm)) : null;
  const cat = bmi ? bmiCategory(bmi) : null;
  const bmr = p?.height_cm && p?.weight_kg && (p?.gender === "male" || p?.gender === "female")
    ? calcBMR({ weightKg: Number(p.weight_kg), heightCm: Number(p.height_cm), age: calcAge(p.birth_date), gender: p.gender })
    : null;
  const tdee = bmr && p?.activity_level ? calcTDEE(bmr, p.activity_level as ActivityLevel) : null;

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/dashboard" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">Profil</h1>
        </header>

        <section className="bg-card p-6 rounded-3xl outline-1 outline-black/5 text-center animate-fade-up">
          <div className="size-20 mx-auto rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold mb-3">
            {(p?.full_name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold">{p?.full_name ?? "Sahabat"}</h2>
          <p className="text-sm text-muted-foreground capitalize">{p?.dietary_preference ?? "Balanced diet"}</p>
        </section>

        {bmi && (
          <section className="grid grid-cols-3 gap-3 animate-fade-up">
            <Stat label="BMI" value={bmi.toString()} sub={cat?.label} />
            <Stat label="BMR" value={bmr ? `${bmr}` : "-"} sub="kcal/hari" />
            <Stat label="TDEE" value={tdee ? `${tdee}` : "-"} sub="kcal/hari" />
          </section>
        )}

        <section className="bg-card rounded-3xl outline-1 outline-black/5 divide-y divide-border overflow-hidden animate-fade-up">
          <Row label="Tinggi" value={p?.height_cm ? `${p.height_cm} cm` : "-"} />
          <Row label="Berat" value={p?.weight_kg ? `${p.weight_kg} kg` : "-"} />
          <Row label="Target berat" value={p?.target_weight_kg ? `${p.target_weight_kg} kg` : "-"} />
          <Row label="Target kalori" value={p?.daily_calorie_target ? `${p.daily_calorie_target} kcal` : "-"} />
          <Row label="Aktivitas" value={p?.activity_level ?? "-"} />
          <Row label="Kota" value={p?.city ?? "-"} />
        </section>

        <Link to="/onboarding" className="flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl">
          <Settings className="size-4" /> Edit profil
        </Link>

        <Link to="/achievements" className="flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl">
          <Trophy className="size-4" /> Pencapaian & badge
        </Link>

        <section className="grid grid-cols-2 gap-3">
          <Link to="/community" className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2">
            <Users className="size-5 text-primary" />
            <span className="text-sm font-semibold">Komunitas</span>
          </Link>
          <button
            onClick={toggle}
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2 text-left"
          >
            {theme === "dark" ? <Sun className="size-5 text-coral" /> : <Moon className="size-5 text-primary" />}
            <span className="text-sm font-semibold">{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
          </button>
          <Link to="/reports" className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2">
            <BarChart3 className="size-5 text-sage-deep" />
            <span className="text-sm font-semibold">Laporan</span>
          </Link>
          <Link to="/reminders" className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2">
            <Bell className="size-5 text-coral" />
            <span className="text-sm font-semibold">Pengingat</span>
          </Link>
          <Link to="/sleep" className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2">
            <MoonStar className="size-5 text-indigo-600" />
            <span className="text-sm font-semibold">Tidur</span>
          </Link>
          <Link to="/mealplan" className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2">
            <Calendar className="size-5 text-coral" />
            <span className="text-sm font-semibold">Meal Plan</span>
          </Link>
          <Link to="/medications" className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2">
            <Pill className="size-5 text-pink-600" />
            <span className="text-sm font-semibold">Obat & Vitamin</span>
          </Link>
          <Link to="/prayer" className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2">
            <Moon className="size-5 text-primary" />
            <span className="text-sm font-semibold">Sholat</span>
          </Link>
        </section>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-destructive font-semibold py-4 rounded-2xl"
        >
          <LogOut className="size-4" /> Keluar
        </button>
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-5 py-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold capitalize">{value}</span>
    </div>
  );
}