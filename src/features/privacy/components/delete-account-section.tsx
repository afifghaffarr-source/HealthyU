import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trash2, AlertTriangle, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteAccount, CONFIRM_DELETE_PHRASE } from "../hooks/use-delete-account";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";

/**
 * Account deletion section for the /profile/privacy page.
 * Implements UU PDP (Undang-Undang Pelindungan Data Pribadi) right to erasure.
 *
 * UX:
 * - When no pending request: show "Hapus akun saya" button → opens AlertDialog
 *   that requires typing the exact phrase "HAPUS" + optional reason.
 * - When pending request exists: show yellow banner with pending date and a
 *   "Batalkan permintaan" button. (Admin/cron processes the actual deletion.)
 * - After successful submission: success toast, the page now shows pending state.
 *   We do NOT auto sign-out — deletion is queued, not immediate. Users can
 *   cancel within the grace window.
 */
export function DeleteAccountSection() {
  const navigate = useNavigate();
  const {
    pendingRequest,
    isPending: loading,
    isMutating,
    error,
    isConfirmValid,
    request,
    cancel,
  } = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");

  const handleRequest = async () => {
    try {
      await request(reason);
      toast.success("Permintaan penghapusan dicatat. Kami akan proses dalam 7×24 jam.");
      setOpen(false);
      setTyped("");
      setReason("");
    } catch (e) {
      toastError(e, "Gagal mengajukan penghapusan akun");
    }
  };

  const handleCancel = async () => {
    try {
      await cancel();
      toast.success("Permintaan penghapusan dibatalkan");
    } catch (e) {
      toastError(e, "Gagal membatalkan permintaan");
    }
  };

  const handleSignOutAndExit = async () => {
    try {
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (e) {
      toastError(e, "Gagal keluar");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Memuat…
      </div>
    );
  }

  // ---- Pending state ----
  if (pendingRequest) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm text-amber-900">
              Permintaan penghapusan akun sedang diproses
            </div>
            <div className="text-xs text-amber-800 mt-1">
              Diajukan{" "}
              {pendingRequest.created_at
                ? new Date(pendingRequest.created_at).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "baru saja"}
              . Data Anda akan dihapus dalam 7×24 jam. Anda masih bisa login untuk membatalkan.
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isMutating}
            className="flex-1"
          >
            {isMutating ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <X className="size-3.5 mr-1" />
            )}
            Batalkan permintaan
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOutAndExit} className="flex-1">
            Keluar
          </Button>
        </div>
        {error && <div className="text-xs text-destructive">{error}</div>}
      </div>
    );
  }

  // ---- Default: show destructive action ----
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="w-full rounded-2xl bg-card border border-destructive/20 p-4 flex items-start gap-3 text-left hover:bg-destructive/5 transition"
        >
          <Trash2 className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm text-destructive">Hapus akun saya</div>
            <div className="text-xs text-muted-foreground mt-1">
              Hapus permanen semua data pribadi Anda (profil, log makanan, latihan, tidur, dll).
              Bisa dibatalkan dalam 7 hari.
            </div>
          </div>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Hapus akun permanen?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Semua data pribadi Anda akan dihapus dalam 7×24 jam. Anda masih bisa login dan
            membatalkan dalam periode ini. Setelah diproses, data tidak dapat dipulihkan.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="delete-reason" className="text-xs font-medium text-foreground">
              Kenapa? (opsional, untuk bantu kami jadi lebih baik)
            </label>
            <Textarea
              id="delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Misal: tidak jadi pakai lagi, pindah ke aplikasi lain, dll."
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <label htmlFor="delete-confirm" className="text-xs font-medium text-foreground">
              Ketik <span className="font-mono font-bold">{CONFIRM_DELETE_PHRASE}</span> untuk
              konfirmasi
            </label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 font-mono"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="delete-confirm-help"
            />
            <div id="delete-confirm-help" className="text-[10px] text-muted-foreground mt-1">
              Harus persis sama, termasuk huruf besar.
            </div>
          </div>

          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isMutating}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRequest}
            disabled={!isConfirmValid(typed) || isMutating}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isMutating && <Loader2 className="size-4 animate-spin mr-1" />}
            Hapus akun saya
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
