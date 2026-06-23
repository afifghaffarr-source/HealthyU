import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPreferences,
  updatePreferences,
  type UserPreferences,
} from "@/features/privacy/lib/preferences.functions";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Ruler, Globe, Palette, Clock, Check } from "lucide-react";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/pengaturan/preferensi")({
  component: PreferensiPage,
});

const UNITS = [
  { value: "metric" as const, label: "Metric", sub: "kg, cm" },
  { value: "imperial" as const, label: "Imperial", sub: "lb, ft" },
];

const LANGUAGES = [
  { value: "id" as const, label: "Bahasa Indonesia", sub: "Default" },
  { value: "en" as const, label: "English", sub: "Coming soon" },
];

const THEMES = [
  { value: "light" as const, label: "Terang", sub: "Selalu mode terang" },
  { value: "dark" as const, label: "Gelap", sub: "Selalu mode gelap" },
  { value: "system" as const, label: "Sistem", sub: "Ikuti tema OS" },
];

const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
];

function PreferensiPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getPreferences);
  const updateFn = useServerFn(updatePreferences);
  const { data: prefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => fetchFn(),
  });
  const updateMut = useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => updateFn({ data: patch }),
    onSuccess: () => {
      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["preferences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    updateMut.mutate({ [key]: value } as Partial<UserPreferences>);
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Preferensi" subtitle="Sesuaikan tampilan & unit" showBack />

        {/* Unit Preference */}
        <Section icon={Ruler} label="Unit Pengukuran" description="Untuk berat & tinggi badan">
          <SegmentedPicker
            value={prefs?.preferred_unit ?? "metric"}
            options={UNITS}
            onChange={(v) => setPref("preferred_unit", v)}
          />
        </Section>

        {/* Language */}
        <Section icon={Globe} label="Bahasa" description="Antarmuka aplikasi">
          <div className="space-y-1.5">
            {LANGUAGES.map((opt) => {
              const active = prefs?.preferred_language === opt.value;
              const disabled = opt.value === "en";
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPref("preferred_language", opt.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition ${
                    active ? "bg-primary/10 text-primary" : "bg-card hover:bg-secondary/30"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div>
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.sub}</p>
                  </div>
                  {active && <Check className="size-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Theme */}
        <Section icon={Palette} label="Tema" description="Tampilan terang/gelap">
          <div className="space-y-1.5">
            {THEMES.map((opt) => {
              const active = prefs?.preferred_theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPref("preferred_theme", opt.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition ${
                    active ? "bg-primary/10 text-primary" : "bg-card hover:bg-secondary/30"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.sub}</p>
                  </div>
                  {active && <Check className="size-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Timezone */}
        <Section icon={Clock} label="Zona Waktu" description="Untuk jadwal shalat & pengingat">
          <select
            value={prefs?.timezone ?? "Asia/Jakarta"}
            onChange={(e) => setPref("timezone", e.target.value)}
            className="w-full bg-card border border-border/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Section>

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Preferensi disimpan ke akun Anda dan disinkronkan antar perangkat.
        </p>
      </div>
      <BottomNav />
    </main>
  );
}

// ─── Section Helper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof Ruler;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 animate-fade-up">
      <div className="flex items-start gap-2.5 px-1">
        <div className="size-7 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
          <Icon className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold leading-tight">{label}</h2>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── Segmented Picker ────────────────────────────────────────────────────────

function SegmentedPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; sub?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 bg-secondary/30 p-1 rounded-xl">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-sm">{opt.label}</span>
            {opt.sub && <span className="text-[9px] opacity-70 mt-0.5">{opt.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
