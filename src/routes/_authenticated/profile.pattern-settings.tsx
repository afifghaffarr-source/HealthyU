import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_PREFERENCES,
  type PatternPreferences,
  getPatternPreferences,
  updatePatternPreferences,
} from "@/features/patterns/lib/patternPreferences.functions";

export const Route = createFileRoute("/_authenticated/profile/pattern-settings")({
  component: PatternSettings,
  loader: async (): Promise<{ preferences: PatternPreferences }> => {
    const prefs = await getPatternPreferences();
    return { preferences: prefs };
  },
});

function PatternSettings() {
  const { preferences: initialPrefs } = Route.useLoaderData();

  const [skipBreakfast, setSkipBreakfast] = useState(initialPrefs.skip_breakfast_threshold);
  const [lateNightHour, setLateNightHour] = useState(initialPrefs.late_night_hour);
  const [irregularVariance, setIrregularVariance] = useState(initialPrefs.irregular_meals_variance);
  const [sensitivity, setSensitivity] = useState(initialPrefs.sensitivity);

  const mutation = useMutation({
    mutationFn: async (prefs: PatternPreferences) => {
      return await updatePatternPreferences({ data: prefs });
    },
    onSuccess: () => {
      alert("✅ Pengaturan pola tersimpan");
    },
    onError: (error: Error) => {
      alert(`❌ Error: ${error.message}`);
    },
  });

  const handleSave = () => {
    mutation.mutate({
      skip_breakfast_threshold: skipBreakfast,
      late_night_hour: lateNightHour,
      irregular_meals_variance: irregularVariance,
      sensitivity,
    });
  };

  const handleReset = () => {
    setSkipBreakfast(DEFAULT_PREFERENCES.skip_breakfast_threshold);
    setLateNightHour(DEFAULT_PREFERENCES.late_night_hour);
    setIrregularVariance(DEFAULT_PREFERENCES.irregular_meals_variance);
    setSensitivity(DEFAULT_PREFERENCES.sensitivity);
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pengaturan Deteksi Pola</h1>
        <p className="text-muted-foreground">
          Sesuaikan sensitivitas deteksi pola makan sesuai preferensi Anda
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Threshold Pola</CardTitle>
            <CardDescription>Atur batas minimal untuk mendeteksi pola tertentu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="skip-breakfast">Lewati Sarapan</Label>
                <span className="text-sm font-medium">{skipBreakfast} hari/minggu</span>
              </div>
              <Slider
                id="skip-breakfast"
                min={2}
                max={5}
                step={1}
                value={[skipBreakfast]}
                onValueChange={(v) => setSkipBreakfast(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                Minimal hari per minggu untuk dianggap melewatkan sarapan
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="late-night">Jam Makan Malam Terlambat</Label>
                <span className="text-sm font-medium">
                  {lateNightHour.toString().padStart(2, "0")}:00
                </span>
              </div>
              <Slider
                id="late-night"
                min={20}
                max={24}
                step={1}
                value={[lateNightHour]}
                onValueChange={(v) => setLateNightHour(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                Jam mulai &ldquo;makan malam terlambat&rdquo;
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="irregular">Variasi Jam Makan Tidak Teratur</Label>
                <span className="text-sm font-medium">±{irregularVariance} jam</span>
              </div>
              <Slider
                id="irregular"
                min={1}
                max={4}
                step={1}
                value={[irregularVariance]}
                onValueChange={(v) => setIrregularVariance(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                Toleransi deviasi standar dari pola makan normal
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensitivitas Deteksi</CardTitle>
            <CardDescription>Seberapa sering pola dilaporkan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="sensitivity">Tingkat Sensitivitas</Label>
              <Select
                value={sensitivity}
                onValueChange={(v) => setSensitivity(v as PatternPreferences["sensitivity"])}
              >
                <SelectTrigger id="sensitivity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Rendah (hanya pola kuat)</SelectItem>
                  <SelectItem value="medium">Sedang (default)</SelectItem>
                  <SelectItem value="high">Tinggi (semua pola terdeteksi)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sensitivitas rendah = lebih sedikit notifikasi, hanya pola yang sangat jelas
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset ke Default
          </Button>
        </div>
      </div>
    </div>
  );
}
