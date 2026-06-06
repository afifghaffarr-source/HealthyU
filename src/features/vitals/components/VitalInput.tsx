export function VitalInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      <div className="flex items-center bg-muted rounded-xl px-3 mt-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent py-2 text-sm outline-none tabular-nums"
        />
        <span className="text-[10px] text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );
}
