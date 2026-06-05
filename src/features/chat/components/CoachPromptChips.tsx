const PROMPTS = [
  "Protein saya kurang, makan apa?",
  "Ide menu warung yang lebih sehat",
  "Bantu evaluasi hari ini",
  "Makan malam ringan apa?",
  "Saya lewat target, harus bagaimana?",
];

export function CoachPromptChips({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
      {PROMPTS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          disabled={disabled}
          className="shrink-0 text-xs font-medium bg-card outline-1 outline-black/10 dark:outline-white/10 px-3 py-2 rounded-full hover:bg-secondary/50 transition disabled:opacity-50"
        >
          {p}
        </button>
      ))}
    </div>
  );
}