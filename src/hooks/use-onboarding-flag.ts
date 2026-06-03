import { useEffect, useState } from "react";

const PREFIX = "hu:onboarded:";

export function useOnboardingFlag(key: string) {
  const storageKey = PREFIX + key;
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setSeen(localStorage.getItem(storageKey) === "1");
    } catch {
      setSeen(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* noop */ }
    setSeen(true);
  };

  return { showOnboarding: !seen, dismiss };
}