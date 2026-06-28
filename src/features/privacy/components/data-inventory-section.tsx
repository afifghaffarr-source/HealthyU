import { Database, Lock } from "lucide-react";
import { INVENTORY_CATEGORIES } from "@/features/privacy/lib/inventoryCategories";

/**
 * Visual "kami menyimpan" inventory. Pure presentational — the bucket table
 * list comes from INVENTORY_CATEGORIES (a static teaching aid). We do NOT
 * count existing rows server-side here: a "berapa banyak data Anda" number
 * is a hotpath that needs careful privacy review (showing "12 log makan"
 * leaks tracking cadence to anyone shoulder-surfing), and the offset
 * value isn't actionable for the user anyway. So: structure-only display.
 *
 * If product later wants a "X baris total" badge, gate it behind a
 * user-active click ("lihat jumlah") that round-trips through PII-aware
 * server fn rather than rendering unconditionally.
 */
export function DataInventorySection({ className = "" }: { className?: string }) {
  const totalTables = INVENTORY_CATEGORIES.reduce((s, c) => s + c.tables.length, 0);
  return (
    <div className={`rounded-2xl bg-card border p-4 ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="size-9 rounded-xl bg-muted grid place-items-center shrink-0">
          <Database className="size-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm">Apa yang kami simpan</div>
          <div className="text-xs text-muted-foreground mt-1">
            Data Anda terdistribusi di {totalTables} tabel, dikelompokkan jadi{" "}
            {INVENTORY_CATEGORIES.length} kategori domain. Setiap baris dilindungi oleh RLS Supabase
            dan hanya bisa diakses oleh akun Anda.
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {INVENTORY_CATEGORIES.map((cat) => (
          <details key={cat.label} className="rounded-xl bg-muted/40 border border-border/50 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-3 text-sm font-medium">
              <span className="truncate">{cat.label}</span>
              <span className="shrink-0 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {cat.tables.length}
                </span>
                <Lock className="size-3 text-primary/70" />
              </span>
            </summary>
            <div className="px-3 pb-3">
              <p className="text-xs text-muted-foreground mt-1 mb-2">{cat.blurb}</p>
              <div className="flex flex-wrap gap-1">
                {cat.tables.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
