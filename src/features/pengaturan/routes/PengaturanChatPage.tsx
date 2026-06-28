import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "@/lib/toast-config";
import {
  getChatRetention,
  setChatRetention,
  clearChatHistory,
} from "@/features/chat/lib/chat.functions";
import {
  CHAT_RETENTION_OPTIONS,
  describeChatRetention,
  MIN_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
} from "@/features/chat/lib/chatRetention";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { ConfirmDialog } from "@/components/healthyu/confirm-dialog";
import { toastError } from "@/lib/toast-config";
import { BottomNav } from "@/components/bottom-nav";

/**
 * AUDIT-017 Phase 3 — chat retention settings page.
 *
 * Lets the user:
 *   1. Choose a retention period (or "keep forever" / null)
 *   2. Manually purge all their chat history (right-to-delete stub)
 *
 * Matches the existing data-retention.ts precedent: opt-in retention,
 * never auto-delete without explicit consent. Default is "keep forever".
 */
export function PengaturanChatPage() {
  const qc = useQueryClient();
  const getRetention = useServerFn(getChatRetention);
  const setRetentionFn = useServerFn(setChatRetention);
  const clearFn = useServerFn(clearChatHistory);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["chat-retention"],
    queryFn: () => getRetention(),
  });

  const [selectedDays, setSelectedDays] = useState<number>(0);

  // Hydrate the local state from the server response. We only do
  // this once when data first arrives so a user's in-flight
  // selection isn't overwritten by a refetch.
  useEffect(() => {
    if (data && selectedDays === 0 && data.days !== 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
      setSelectedDays(data.days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.days]);

  const saveMut = useMutation({
    mutationFn: (days: number) => setRetentionFn({ data: { days } }),
    onSuccess: ({ days }) => {
      setSelectedDays(days);
      qc.invalidateQueries({ queryKey: ["chat-retention"] });
      toast.success("Pengaturan retensi tersimpan");
    },
    onError: (e: Error) => toastError(e, "Gagal menyimpan pengaturan"),
  });

  const deleteMut = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat"] });
      toast.success("Semua riwayat chat telah dihapus");
    },
    onError: (e: Error) => toastError(e, "Gagal menghapus chat"),
  });

  return (
    <main className="min-h-dvh bg-background pb-24">
      <div className="mx-auto w-full max-w-md px-4 sm:px-5">
        <TopAppBar title="Pengaturan Chat" subtitle="Retensi & privasi" showBack />
      </div>

      <div className="mx-auto w-full max-w-md px-4 sm:px-5 py-4 space-y-6">
        {/* Retention period selector */}
        <section className="rounded-[1.6rem] border border-border/60 bg-background/80 p-4 shadow-sm space-y-3">
          <header>
            <h2 className="text-sm font-bold">Retensi Chat Otomatis</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Pilih berapa lama chat Anda tersimpan. Chat yang lebih lama dari periode yang dipilih
              akan dihapus otomatis setiap kali Anda mengirim pesan baru.
            </p>
          </header>

          {isLoading ? (
            <p className="text-xs text-muted-foreground">Memuat…</p>
          ) : (
            <div className="space-y-2">
              {CHAT_RETENTION_OPTIONS.map((opt) => {
                const isSelected = selectedDays === (opt.value ?? 0);
                return (
                  <label
                    key={String(opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="retention"
                      value={String(opt.value)}
                      checked={isSelected}
                      onChange={() => setSelectedDays(opt.value ?? 0)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-muted-foreground">
              Saat ini:{" "}
              <span className="font-semibold text-foreground">
                {describeChatRetention(data?.days === 0 ? null : (data?.days ?? null))}
              </span>
            </p>
            <button
              onClick={() => saveMut.mutate(selectedDays)}
              disabled={saveMut.isPending || selectedDays === data?.days}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {saveMut.isPending ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </section>

        {/* Right-to-delete: purge all chats now */}
        <section className="rounded-[1.6rem] border border-destructive/30 bg-destructive/5 p-4 shadow-sm space-y-3">
          <header className="flex items-start gap-3">
            <div className="size-10 rounded-2xl grid place-items-center shrink-0 bg-destructive/15 text-destructive">
              <Trash2 className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold">Hapus semua chat sekarang</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Menghapus seluruh riwayat chat Anda secara permanen. Tidak dapat dibatalkan.
              </p>
            </div>
          </header>
          <div className="flex justify-end">
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleteMut.isPending}
              className="px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {deleteMut.isPending ? "Menghapus…" : "Hapus semua chat"}
            </button>
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground text-center">
          Periode retensi: {MIN_RETENTION_DAYS}–{MAX_RETENTION_DAYS} hari (10 tahun). UUID UU PDP
          2022 compliance.
        </p>
      </div>

      <BottomNav />

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus semua chat?"
        description="Tindakan ini tidak dapat dibatalkan. Semua pesan dan foto yang dikirim akan dihapus permanen dari akun Anda."
        confirmLabel="Hapus permanen"
        cancelLabel="Batal"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          deleteMut.mutate();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </main>
  );
}
