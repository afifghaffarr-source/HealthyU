import { useContext } from "react";
import { LiveAnnouncerContext, type AnnounceFn } from "./live-announcer.context";

/**
 * Hook: subscribe to the global aria-live announcer. Mount the provider
 * once in `__root.tsx`. No-op fallback if used outside provider
 * (e.g. unit tests).
 */
export function useAnnounce(): AnnounceFn {
  const ctx = useContext(LiveAnnouncerContext);
  return ctx ?? (() => {});
}
