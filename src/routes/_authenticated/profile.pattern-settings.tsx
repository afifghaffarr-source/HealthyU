import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  getPatternPreferences,
  updatePatternPreferences,
} from "~/features/patterns/lib/patternPreferences.functions";
import {
  DEFAULT_PATTERN_PREFERENCES,
  type PatternPreferences,
} from "~/features/patterns/types/preferences";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

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
    setSkipBreakfast(DEFAULT_PATTERN_PREFERENCES.skip_breakfast_threshold);
    setLateNightHour(DEFAULT_PATTERN_PREFERENCES.late_night_hour);
    setIrregularVariance(DEFAULT_PATTERN_PREFERENCES.irregular_meals_variance);
    setSensitivity(DEFAULT_PATTERN_PREFERENCES.sensitivity);
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
            {/* Skip Breakfast Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="skip-breakfast" className="text-base font-medium">
                  Skip Sarapan
                </Label>
                <span className="text-sm text-muted-foreground">{skipBreakfast} dari 5 hari</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Deteksi pola skip sarapan jika melewatkan N hari dalam 5 hari kerja terakhir
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">2</span>
                <Slider
                  id="skip-breakfast"
                  value={[skipBreakfast]}
                  onValueChange={(val: number[]) => setSkipBreakfast(val[0])}
                  min={2}
                  max={5}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">5</span>
              </div>
            </div>

            {/* Late Night Hour */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="late-night" className="text-base font-medium">
                  Jam Makan Malam
                </Label>
                <span className="text-sm text-muted-foreground">{lateNightHour}:00</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Deteksi makan larut malam jika makan setelah jam ini
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">20:00</span>
                <Slider
                  id="late-night"
                  value={[lateNightHour]}
                  onValueChange={(val: number[]) => setLateNightHour(val[0])}
                  min={20}
                  max={24}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">24:00</span>
              </div>
            </div>

            {/* Irregular Meals Variance */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="irregular" className="text-base font-medium">
                  Variasi Jam Makan
                </Label>
                <span className="text-sm text-muted-foreground">{irregularVariance} jam</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Deteksi pola tidak teratur jika jam makan bervariasi lebih dari N jam
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">1</span>
                <Slider
                  id="irregular"
                  value={[irregularVariance]}
                  onValueChange={(val: number[]) => setIrregularVariance(val[0])}
                  min={1}
                  max={4}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">4</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensitivitas Global</CardTitle>
            <CardDescription>Seberapa ketat sistem mendeteksi pola</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="sensitivity" className="text-base font-medium">
              Tingkat Sensitivitas
            </Label>
            <p className="text-sm text-muted-foreground">
              Tingkat sensitivitas keseluruhan deteksi pola
            </p>
            <Select
              value={sensitivity}
              onValueChange={(val: string) =>
                setSensitivity(val as PatternPreferences["sensitivity"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Rendah (lebih toleran)</SelectItem>
                <SelectItem value="medium">Sedang (default)</SelectItem>
                <SelectItem value="high">Tinggi (lebih ketat)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={mutation.isPending} className="flex-1">
            {mutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
          <Button onClick={handleReset} variant="outline">
            Reset Default
          </Button>
        </div>
      </div>
    </div>
  );
}
