import { type OnboardingForm, primaryBtn } from "./onboardingShared";

export function StepIdentity({
  form,
  setForm,
  onNext,
}: {
  form: OnboardingForm;
  setForm: (f: OnboardingForm) => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold mb-1">Halo! Siapa namamu?</h1>
        <p className="text-muted-foreground text-sm">Kami ingin mengenalmu lebih baik.</p>
      </div>
      <input
        placeholder="Nama lengkap"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5"
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setForm({ ...form, gender: "male" })}
          className={`py-4 rounded-2xl font-semibold transition ${form.gender === "male" ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
        >
          Pria
        </button>
        <button
          onClick={() => setForm({ ...form, gender: "female" })}
          className={`py-4 rounded-2xl font-semibold transition ${form.gender === "female" ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
        >
          Wanita
        </button>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Tanggal lahir</span>
        <input
          type="date"
          value={form.birth_date}
          onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
          className="mt-1.5 w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5"
        />
      </label>
      <button onClick={onNext} className={`w-full ${primaryBtn}`}>
        Lanjut
      </button>
    </section>
  );
}
