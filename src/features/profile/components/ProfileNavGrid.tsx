import { Link } from "@tanstack/react-router";
import {
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
  Settings,
  Lightbulb,
  ShieldAlert,
  BookOpen,
} from "lucide-react";

const tileCls =
  "bg-card p-4 rounded-2xl outline-1 outline-foreground/10 flex flex-col items-start gap-2 min-h-20 active:scale-[0.98] transition";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold px-1 pt-1">
      {children}
    </h3>
  );
}

export function ProfileNavGrid({
  theme,
  onToggleTheme,
}: {
  theme: string;
  onToggleTheme: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <SectionHeader>Target & nutrisi</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/weight" className={tileCls}>
            <Scale className="size-5 text-emerald-600" aria-hidden />
            <span className="text-sm font-semibold">Berat Badan</span>
          </Link>
          <Link to="/mealplan" className={tileCls}>
            <Calendar className="size-5 text-coral" aria-hidden />
            <span className="text-sm font-semibold">Meal Plan</span>
          </Link>
          <Link to="/water" className={tileCls}>
            <Droplet className="size-5 text-sky-600" aria-hidden />
            <span className="text-sm font-semibold">Hidrasi</span>
          </Link>
          <Link to="/resep" className={tileCls}>
            <ChefHat className="size-5 text-sage-deep" aria-hidden />
            <span className="text-sm font-semibold">Resep Sehat</span>
          </Link>
          <Link to="/sleep" className={tileCls}>
            <MoonStar className="size-5 text-indigo-600" aria-hidden />
            <span className="text-sm font-semibold">Tidur</span>
          </Link>
          <Link to="/vitals" className={tileCls}>
            <HeartPulse className="size-5 text-red-600" aria-hidden />
            <span className="text-sm font-semibold">Vital Signs</span>
          </Link>
          <Link to="/mood" className={tileCls}>
            <Smile className="size-5 text-amber-500" aria-hidden />
            <span className="text-sm font-semibold">Mood & Jurnal</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader>Estimasi AI & laporan</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/coach" className={tileCls}>
            <Sparkles className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">AI Coach</span>
          </Link>
          <Link to="/articles" className={tileCls}>
            <BookOpen className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Artikel</span>
          </Link>
          <Link to="/progress" className={tileCls}>
            <Camera className="size-5 text-coral" aria-hidden />
            <span className="text-sm font-semibold">Foto Progres</span>
          </Link>
          <Link to="/reports" className={tileCls}>
            <BarChart3 className="size-5 text-sage-deep" aria-hidden />
            <span className="text-sm font-semibold">Laporan</span>
          </Link>
          <Link to="/profile/insights" className={tileCls}>
            <Lightbulb className="size-5 text-amber-500" aria-hidden />
            <span className="text-sm font-semibold">Pattern Insights</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader>Notifikasi</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/reminders" className={tileCls}>
            <Bell className="size-5 text-coral" aria-hidden />
            <span className="text-sm font-semibold">Pengingat</span>
          </Link>
          <Link to="/notifications" className={tileCls}>
            <Bell className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Notifikasi</span>
          </Link>
          <Link to="/prayer" className={tileCls}>
            <Moon className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Sholat</span>
          </Link>
          <Link to="/medications" className={tileCls}>
            <Pill className="size-5 text-pink-600" aria-hidden />
            <span className="text-sm font-semibold">Obat & Vitamin</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader>Data & privasi</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/profile/patterns" className={tileCls}>
            <Settings className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Pattern Settings</span>
          </Link>
          <Link to="/profile/privacy" className={tileCls}>
            <ShieldAlert className="size-5 text-red-600" aria-hidden />
            <span className="text-sm font-semibold">Privacy</span>
          </Link>
          <Link to="/backup" className={tileCls}>
            <Download className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Backup Data</span>
          </Link>
          <Link to="/health-import" className={tileCls}>
            <Activity className="size-5 text-emerald-600" aria-hidden />
            <span className="text-sm font-semibold">Import Apple/Samsung</span>
          </Link>
          <Link to="/wearable" className={tileCls}>
            <Activity className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Wearable</span>
          </Link>
          <Link to="/offline-queue" className={tileCls}>
            <AlertTriangle className="size-5 text-amber-600" aria-hidden />
            <span className="text-sm font-semibold">Sync Gagal</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader>Komunitas</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/community" className={tileCls}>
            <Users className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Komunitas</span>
          </Link>
          <Link to="/leaderboard" className={tileCls}>
            <Medal className="size-5 text-yellow-500" aria-hidden />
            <span className="text-sm font-semibold">Leaderboard</span>
          </Link>
          <Link to="/groups" className={tileCls}>
            <UsersRound className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Grup Teman</span>
          </Link>
          <Link to="/referrals" className={tileCls}>
            <UsersRound className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Ajak Teman</span>
          </Link>
          <Link to="/rewards" className={tileCls}>
            <Medal className="size-5 text-amber-600" aria-hidden />
            <span className="text-sm font-semibold">Tukar Koin</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader>Tampilan & tentang</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onToggleTheme}
            className={`${tileCls} text-left`}
            aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          >
            {theme === "dark" ? (
              <Sun className="size-5 text-coral" aria-hidden />
            ) : (
              <Moon className="size-5 text-primary" aria-hidden />
            )}
            <span className="text-sm font-semibold">
              {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
