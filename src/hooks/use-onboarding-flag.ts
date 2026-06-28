import { useEffect, useState } from "react";

const PREFIX = "hu:onboarded:";

export function useOnboardingFlag(key: string) {
  const storageKey = PREFIX + key;
  // Initial `seen=true` so the SSR / first-paint hides the onboarding overlay
  // until the client-side localStorage check runs.
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external store sync (localStorage); client-only.
      setSeen(localStorage.getItem(storageKey) === "1");
    } catch {
      setSeen(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* noop */
    }
    setSeen(true);
  };

  return { showOnboarding: !seen, dismiss };
}
