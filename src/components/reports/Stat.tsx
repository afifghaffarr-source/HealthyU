export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums mt-1">
        {value}
        <span className="text-xs font-medium text-muted-foreground ml-1">{sub}</span>
      </p>
    </div>
  );
}