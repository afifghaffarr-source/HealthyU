export function SourceCard({
  icon,
  label,
  hint,
  accept,
  onFile,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  accept: string;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`bg-card rounded-2xl p-4 outline-1 outline-black/10 flex flex-col gap-2 cursor-pointer hover:bg-secondary/40 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      {icon}
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function MiniStat({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-muted/60 rounded-xl p-2">
      <p className="text-base font-bold">{v}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}