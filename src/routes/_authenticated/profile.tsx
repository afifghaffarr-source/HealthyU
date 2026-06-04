import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { HealthCard } from "@/components/healthyu/health-card";
import { HealthScoreCard } from "@/components/healthyu/health-score-card";
import { supabase } from "@/integrations/supabase/client";
import { calcAge, calcBMI, bmiCategory, calcBMR, calcTDEE, type ActivityLevel } from "@/lib/health";
import {
  LogOut,
  Settings,
  Trophy,
  Moon,
  Calendar,
  Pill,
  MoonStar,
  BarChart3,
  Bell,
  Users,
  Sun,
  Medal,
  Camera,
  ChefHat,
  Smile,
  Droplet,
  Scale,
  HeartPulse,
  Activity,
  Download,
  UsersRound,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";

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

  const bmi =
    p?.height_cm && p?.weight_kg ? calcBMI(Number(p.weight_kg), Number(p.height_cm)) : null;
  const cat = bmi ? bmiCategory(bmi) : null;
  const bmr =
    p?.height_cm && p?.weight_kg && (p?.gender === "male" || p?.gender === "female")
      ? calcBMR({
          weightKg: Number(p.weight_kg),
          heightCm: Number(p.height_cm),
          age: calcAge(p.birth_date),
          gender: p.gender,
        })
      : null;
  const tdee = bmr && p?.activity_level ? calcTDEE(bmr, p.activity_level as ActivityLevel) : null;

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Profil" subtitle={p?.full_name ?? "Sahabat"} showBack />

        <section className="bg-card p-6 rounded-3xl outline-1 outline-black/5 text-center animate-fade-up">
          <div className="size-20 mx-auto rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold mb-3">
            {(p?.full_name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold">{p?.full_name ?? "Sahabat"}</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {p?.dietary_preference ?? "Balanced diet"}
          </p>
        </section>

        {bmi && (
          <section className="grid grid-cols-3 gap-3 animate-fade-up">
            <HealthCard
              label="BMI"
              value={bmi.toString()}
              trend={cat?.label}
              tone="green"
              icon={Scale}
            />
            <HealthCard
              label="BMR"
              value={bmr ?? "-"}
              unit="kcal"
              tone="orange"
              icon={HeartPulse}
            />
            <HealthCard label="TDEE" value={tdee ?? "-"} unit="kcal" tone="blue" icon={Activity} />
          </section>
        )}

        {bmi && (
          <HealthScoreCard
            className="animate-fade-up"
            factors={[
              {
                label: "BMI",
                value: bmi >= 18.5 && bmi <= 24.9 ? 100 : Math.max(0, 100 - Math.abs(bmi - 22) * 8),
              },
              { label: "Aktivitas", value: activityScore(p?.activity_level) },
              {
                label: "Target berat",
                value: weightTargetScore(Number(p?.weight_kg), Number(p?.target_weight_kg)),
              },
              { label: "Kalori harian", value: p?.daily_calorie_target ? 80 : 40 },
            ]}
          />
        )}

        <section className="bg-card rounded-3xl outline-1 outline-black/5 divide-y divide-border overflow-hidden animate-fade-up">
          <Row label="Tinggi" value={p?.height_cm ? `${p.height_cm} cm` : "-"} />
          <Row label="Berat" value={p?.weight_kg ? `${p.weight_kg} kg` : "-"} />
          <Row
            label="Target berat"
            value={p?.target_weight_kg ? `${p.target_weight_kg} kg` : "-"}
          />
          <Row
            label="Target kalori"
            value={p?.daily_calorie_target ? `${p.daily_calorie_target} kcal` : "-"}
          />
          <Row label="Aktivitas" value={p?.activity_level ?? "-"} />
          <Row label="Kota" value={p?.city ?? "-"} />
        </section>

        <Link
          to="/onboarding"
          className="flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl"
        >
          <Settings className="size-4" /> Edit profil
        </Link>

        <Link
          to="/achievements"
          className="flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl"
        >
          <Trophy className="size-4" /> Pencapaian & badge
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/profile/scan-stats"
            className="text-center text-xs bg-card outline-1 outline-black/10 py-3 rounded-2xl"
          >
            📊 Statistik Scan AI
          </Link>
          <Link
            to="/profile/privacy"
            className="text-center text-xs bg-card outline-1 outline-black/10 py-3 rounded-2xl"
          >
            🔒 Privasi
          </Link>
          <Link
            to="/insights"
            className="text-center text-xs bg-card outline-1 outline-black/10 py-3 rounded-2xl"
          >
            ✨ Insight AI
          </Link>
          <Link
            to="/recipes/recommendations"
            className="text-center text-xs bg-card outline-1 outline-black/10 py-3 rounded-2xl"
          >
            🍽️ Rekomendasi Resep
          </Link>
          <Link
            to="/reports/nutrition"
            className="text-center text-xs bg-card outline-1 outline-black/10 py-3 rounded-2xl"
          >
            📈 Tren Nutrisi
          </Link>
          <Link
            to="/scan/barcode"
            className="text-center text-xs bg-card outline-1 outline-black/10 py-3 rounded-2xl"
          >
            🏷️ Scan Barcode
          </Link>
          <Link
            to="/scan/menu"
            className="text-center text-xs bg-card outline-1 outline-black/10 py-3 rounded-2xl"
          >
            📋 Scan Menu
          </Link>
          <Link
            to="/scan/recipe"
            className="text-center text-xs bg-card outline-1 outline-black/10 py-3 rounded-2xl"
          >
            📖 Scan Resep
          </Link>
        </div>

        <section className="grid grid-cols-2 gap-3">
          <Link
            to="/community"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Users className="size-5 text-primary" />
            <span className="text-sm font-semibold">Komunitas</span>
          </Link>
          <Link
            to="/leaderboard"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Medal className="size-5 text-yellow-500" />
            <span className="text-sm font-semibold">Leaderboard</span>
          </Link>
          <Link
            to="/progress"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Camera className="size-5 text-coral" />
            <span className="text-sm font-semibold">Foto Progres</span>
          </Link>
          <Link
            to="/recipes"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <ChefHat className="size-5 text-sage-deep" />
            <span className="text-sm font-semibold">Resep Sehat</span>
          </Link>
          <button
            onClick={toggle}
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2 text-left"
          >
            {theme === "dark" ? (
              <Sun className="size-5 text-coral" />
            ) : (
              <Moon className="size-5 text-primary" />
            )}
            <span className="text-sm font-semibold">
              {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            </span>
          </button>
          <Link
            to="/reports"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <BarChart3 className="size-5 text-sage-deep" />
            <span className="text-sm font-semibold">Laporan</span>
          </Link>
          <Link
            to="/reminders"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Bell className="size-5 text-coral" />
            <span className="text-sm font-semibold">Pengingat</span>
          </Link>
          <Link
            to="/wearable"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Activity className="size-5 text-primary" />
            <span className="text-sm font-semibold">Wearable</span>
          </Link>
          <Link
            to="/sleep"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <MoonStar className="size-5 text-indigo-600" />
            <span className="text-sm font-semibold">Tidur</span>
          </Link>
          <Link
            to="/mealplan"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Calendar className="size-5 text-coral" />
            <span className="text-sm font-semibold">Meal Plan</span>
          </Link>
          <Link
            to="/medications"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Pill className="size-5 text-pink-600" />
            <span className="text-sm font-semibold">Obat & Vitamin</span>
          </Link>
          <Link
            to="/prayer"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Moon className="size-5 text-primary" />
            <span className="text-sm font-semibold">Sholat</span>
          </Link>
          <Link
            to="/mood"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Smile className="size-5 text-amber-500" />
            <span className="text-sm font-semibold">Mood & Jurnal</span>
          </Link>
          <Link
            to="/water"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Droplet className="size-5 text-sky-600" />
            <span className="text-sm font-semibold">Hidrasi</span>
          </Link>
          <Link
            to="/weight"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Scale className="size-5 text-emerald-600" />
            <span className="text-sm font-semibold">Berat Badan</span>
          </Link>
          <Link
            to="/vitals"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <HeartPulse className="size-5 text-red-600" />
            <span className="text-sm font-semibold">Vital Signs</span>
          </Link>
          <Link
            to="/backup"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Download className="size-5 text-primary" />
            <span className="text-sm font-semibold">Backup Data</span>
          </Link>
          <Link
            to="/groups"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <UsersRound className="size-5 text-primary" />
            <span className="text-sm font-semibold">Grup Teman</span>
          </Link>
          <Link
            to="/coach"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Sparkles className="size-5 text-primary" />
            <span className="text-sm font-semibold">AI Coach</span>
          </Link>
          <Link
            to="/health-import"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Activity className="size-5 text-emerald-600" />
            <span className="text-sm font-semibold">Import Apple/Samsung</span>
          </Link>
          <Link
            to="/offline-queue"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <AlertTriangle className="size-5 text-amber-600" />
            <span className="text-sm font-semibold">Sync Gagal</span>
          </Link>
          <Link
            to="/notifications"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Bell className="size-5 text-primary" />
            <span className="text-sm font-semibold">Notifikasi</span>
          </Link>
          <Link
            to="/referrals"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <UsersRound className="size-5 text-primary" />
            <span className="text-sm font-semibold">Ajak Teman</span>
          </Link>
          <Link
            to="/rewards"
            className="bg-card p-4 rounded-2xl outline-1 outline-black/10 flex flex-col items-start gap-2"
          >
            <Medal className="size-5 text-amber-600" />
            <span className="text-sm font-semibold">Tukar Koin</span>
          </Link>
        </section>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-destructive font-semibold py-4 rounded-2xl"
        >
          <LogOut className="size-4" /> Keluar
        </button>

        <LocaleSwitcher />
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
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

function activityScore(level: string | null | undefined): number {
  switch (level) {
    case "very_active":
      return 100;
    case "active":
      return 85;
    case "moderate":
      return 70;
    case "light":
      return 55;
    case "sedentary":
      return 35;
    default:
      return 50;
  }
}

function weightTargetScore(weight: number, target: number): number {
  if (!weight || !target) return 50;
  const diff = Math.abs(weight - target);
  return Math.max(0, Math.round(100 - diff * 4));
}
