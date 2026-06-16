import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, updateProfile } from "@/features/profile/lib/profile.functions";
import { calcAge, calcBMR, calcTDEE, type ActivityLevel } from "@/lib/health";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import {
  type Goal,
  type OnboardingForm,
  StepIdentity,
  StepBody,
  StepGoal,
  StepLifestyle,
  StepHealth,
} from "@/features/onboarding/components/OnboardingSteps";
import { type Pace, paceDelta } from "@/features/onboarding/components/onboardingShared";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const TOTAL_STEPS = 5;

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<Goal>("lose");
  const [pace, setPace] = useState<Pace>("steady");
  const [form, setForm] = useState<OnboardingForm>({
    full_name: profile?.full_name ?? "",
    gender: "male",
    birth_date: "1995-01-01",
    height_cm: 170,
    weight_kg: 70,
    target_weight_kg: 65,
    activity_level: "moderate",
    dietary_preference: "balanced",
    city: "Jakarta",
    allergies: [],
    health_conditions: [],
  });

  useEffect(() => {
    if (!profile) return;
    setForm((current: OnboardingForm) => ({
      ...current,
      full_name: profile.full_name ?? current.full_name,
      gender: profile.gender === "female" ? "female" : current.gender,
      birth_date: profile.birth_date ?? current.birth_date,
      height_cm: profile.height_cm ? Number(profile.height_cm) : current.height_cm,
      weight_kg: profile.weight_kg ? Number(profile.weight_kg) : current.weight_kg,
      target_weight_kg: profile.target_weight_kg
        ? Number(profile.target_weight_kg)
        : current.target_weight_kg,
      activity_level: (profile.activity_level as ActivityLevel | null) ?? current.activity_level,
      dietary_preference: profile.dietary_preference ?? current.dietary_preference,
      city: profile.city ?? current.city,
      allergies: Array.isArray(profile.allergies) ? profile.allergies : current.allergies,
      health_conditions: Array.isArray(profile.health_conditions)
        ? profile.health_conditions
        : current.health_conditions,
    }));
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profil tersimpan!");
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toastError(e, "Gagal simpan"),
  });

  const bmr = calcBMR({
    weightKg: form.weight_kg,
    heightCm: form.height_cm,
    age: calcAge(form.birth_date),
    gender: form.gender,
  });
  const tdee = calcTDEE(bmr, form.activity_level);

  const finish = () => {
    const target = Math.max(1200, tdee + paceDelta(goal, pace));
    mutation.mutate({ ...form, daily_calorie_target: target, onboarded: true });
  };

  const toggleIn = (key: "allergies" | "health_conditions", val: string) =>
    setForm((f: OnboardingForm) => {
      const has = f[key].includes(val);
      return { ...f, [key]: has ? f[key].filter((x: string) => x !== val) : [...f[key], val] };
    });

  return (
    <main className="min-h-dvh bg-background px-6 py-10 max-w-md mx-auto">
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, idx) => idx + 1).map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-mint"}`}
          />
        ))}
      </div>

      {step === 1 && <StepIdentity form={form} setForm={setForm} onNext={() => setStep(2)} />}
      {step === 2 && (
        <StepBody
          form={form}
          setForm={setForm}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepGoal
          goal={goal}
          setGoal={setGoal}
          pace={pace}
          setPace={setPace}
          tdee={tdee}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <StepLifestyle
          form={form}
          setForm={setForm}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
        />
      )}
      {step === 5 && (
        <StepHealth
          form={form}
          toggleIn={toggleIn}
          onBack={() => setStep(4)}
          onFinish={finish}
          pending={mutation.isPending}
        />
      )}
    </main>
  );
}
