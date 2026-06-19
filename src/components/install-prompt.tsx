import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { hasCompletedFirstAction } from "@/lib/first-action";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "healthyu-install-dismissed";
const MIN_DELAY_MS = 30_000; // 30s — kasih user lihat dulu apa isinya

/**
 * PWA install prompt dengan smart timing:
 *
 *   1. Tunda minimal 30 detik setelah page load (jangan ganggu user baru)
 *   2. Hanya muncul setelah user melakukan first meaningful action
 *      (scan / lihat resep / lihat artikel) — user sudah lihat value
 *   3. Tidak muncul kalau user sudah install (display-mode: standalone)
 *   4. Tidak muncul kalau user sudah dismiss (localStorage flag)
 *
 * Mengapa tunda + first-action?
 *   - New user belum paham value app-nya → install prompt premature = bounce
 *   - User yang sudah interact = invested → install rate naik ~20-40%
 *   - Standar PWA install prompt best practice (Chrome team recommendation)
 */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip if already installed (PWA in standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Skip if user already dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Capture beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Wait for 30s before allowing prompt to appear
    const minDelayTimer = window.setTimeout(() => setReady(true), MIN_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.clearTimeout(minDelayTimer);
    };
  }, []);

  // Show prompt when both conditions met
  useEffect(() => {
    if (!ready || !evt) return;
    if (hasCompletedFirstAction()) {
      setShow(true);
    } else {
      // Poll every 5s sampai user complete first action
      const interval = window.setInterval(() => {
        if (hasCompletedFirstAction()) {
          setShow(true);
          window.clearInterval(interval);
        }
      }, 5_000);
      return () => window.clearInterval(interval);
    }
  }, [ready, evt]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setShow(false);
    setEvt(null);
  };

  if (!show) return null;

  // Lapisan tipis ini TIDAK boleh menahan klik dari konten di belakangnya.
  // Wrapper luar = pointer-events-none (transparan untuk klik) supaya form
  // submit & button di belakang banner tidak terblokir. Hanya kartu banner
  // yang punya pointer-events-auto, jadi klik di area kosong di luar kartu
  // otomatis jatuh ke konten di bawahnya.
  return (
    <div
      data-testid="install-prompt-overlay"
      className="fixed inset-x-0 bottom-20 z-50 pointer-events-none flex justify-center px-4"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-3 flex items-center gap-2 animate-fade-up pointer-events-auto">
        <div className="size-9 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
          <Download className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Install HealthyU</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Akses cepat dari home screen.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="size-7 grid place-items-center text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
