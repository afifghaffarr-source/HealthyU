import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LiveAnnouncerContext, type AnnounceFn } from "./live-announcer.context";

export type { AnnounceFn };

/**
 * Global aria-live announcer. Mount once in __root.tsx; consumer components
 * call `useAnnounce()` from `./live-announcer.hook` to push messages to
 * a shared SR-only region.
 */
export function LiveAnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback<AnnounceFn>((message, politeness = "polite") => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    if (politeness === "assertive") setAssertive(message);
    else setPolite(message);
    clearTimer.current = setTimeout(() => {
      setPolite("");
      setAssertive("");
    }, 1500);
  }, []);

  useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    [],
  );

  return (
    <LiveAnnouncerContext.Provider value={announce}>
      {children}
      <span role="status" aria-live="polite" className="sr-only">
        {polite}
      </span>
      <span role="alert" aria-live="assertive" className="sr-only">
        {assertive}
      </span>
    </LiveAnnouncerContext.Provider>
  );
}
