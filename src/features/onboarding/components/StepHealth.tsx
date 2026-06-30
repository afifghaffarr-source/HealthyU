import { Check } from "lucide-react";
import { DisclaimerCard } from "@/components/healthyu/disclaimer-card";
import { useTranslation } from "@/lib/i18n";
import {
  ALLERGIES,
  HEALTH_CONDITIONS,
  type OnboardingForm,
  primaryBtn,
  secondaryBtn,
  WhyAskDisclosure,
} from "./onboardingShared";

export function StepHealth({
  form,
  toggleIn,
  onBack,
  onFinish,
  pending,
}: {
  form: OnboardingForm;
  toggleIn: (key: "allergies" | "health_conditions", val: string) => void;
  onBack: () => void;
  onFinish: () => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold mb-1">Kondisi & alergi</h1>
        <p className="text-muted-foreground text-sm">
          AI akan menyesuaikan rekomendasi makanan. Data ini hanya untuk membuat saran lebih
          relevan.
        </p>
      </div>
      <DisclaimerCard />
      <WhyAskDisclosure>
        Info kondisi & alergi hanya dipakai supaya saran makanan lebih aman & relevan untukmu.
        HealthyU bukan pengganti dokter — untuk kondisi serius (diabetes, jantung, hamil/menyusui,
        gangguan makan), tetap konsultasi ke tenaga medis.
      </WhyAskDisclosure>
      <div>
        <p className="text-sm font-medium mb-2">Kondisi kesehatan</p>
        <div className="flex flex-wrap gap-2">
          {HEALTH_CONDITIONS.map((c) => {
            const active = form.health_conditions.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleIn("health_conditions", c)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card outline-1 outline-black/10"
                }`}
              >
                {active ? <Check className="size-3" /> : null}
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Alergi makanan</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGIES.map((a) => {
            const active = form.allergies.includes(a);
            return (
              <button
                key={a}
                onClick={() => toggleIn("allergies", a)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card outline-1 outline-black/10"
                }`}
              >
                {active ? <Check className="size-3" /> : null}
                {a}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-4">
        <button onClick={onBack} className={secondaryBtn}>
          {t("common.back")}
        </button>
        <button
          onClick={onFinish}
          disabled={pending}
          className={`${primaryBtn} disabled:opacity-60`}
        >
          {pending ? t("common.saving") : t("common.start")}
        </button>
      </div>
      <p className="text-[11px] text-center text-muted-foreground pt-1">
        {t("onboarding.health.hint")}
      </p>
    </section>
  );
}
