import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "healthyu-install-dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
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

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 w-[92%] max-w-sm bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-fade-up">
      <div className="size-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
        <Download className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Install HealthyU</p>
        <p className="text-xs text-muted-foreground">Akses cepat dari home screen.</p>
      </div>
      <button onClick={install} className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-xl">
        Install
      </button>
      <button onClick={dismiss} aria-label="Tutup" className="size-8 grid place-items-center text-muted-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}