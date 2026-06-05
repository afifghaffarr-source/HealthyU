import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";
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
  Scale,
  HeartPulse,
  Activity,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProfileNavGrid } from "@/features/profile/components/ProfileNavGrid";
import { DisclaimerCard } from "@/components/healthyu/disclaimer-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    <main className="min-h-dvh bg-background pb-28">
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

        <ProfileNavGrid theme={theme} onToggleTheme={toggle} />

        <DisclaimerCard />

        <section className="space-y-2 pt-2">
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
            Zona Hati-hati
          </h3>
          <div className="rounded-2xl bg-destructive/5 dark:bg-destructive/10 outline-1 outline-destructive/25 p-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="w-full flex items-center justify-center gap-2 text-destructive font-semibold py-3 rounded-xl hover:bg-destructive/10 transition min-h-11"
                  aria-label="Keluar dari akun"
                >
                  <LogOut className="size-4" /> Keluar dari akun
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Keluar dari HealthyU?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Kamu akan keluar dari akun ini. Data tetap aman dan bisa diakses lagi saat
                    masuk kembali.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Ya, keluar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        <LocaleSwitcher />
      </div>
      <BottomNav />
    </main>
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
