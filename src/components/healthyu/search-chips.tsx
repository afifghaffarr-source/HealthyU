import { X } from "lucide-react";

interface Props {
  label?: string;
  items: string[];
  onPick: (term: string) => void;
  onRemove?: (term: string) => void;
  onClear?: () => void;
  variant?: "recent" | "suggestion";
}

export function SearchChips({ label, items, onPick, onRemove, onClear, variant = "recent" }: Props) {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      {(label || onClear) && (
        <div className="flex items-center justify-between">
          {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
          {onClear && variant === "recent" && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Bersihkan
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {items.map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-muted/70 text-xs text-foreground/80"
          >
            <button
              type="button"
              onClick={() => onPick(term)}
              className="hover:text-primary transition"
            >
              {term}
            </button>
            {onRemove && variant === "recent" && (
              <button
                type="button"
                aria-label={`Hapus ${term}`}
                onClick={() => onRemove(term)}
                className="size-4 grid place-items-center rounded-full hover:bg-background"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}