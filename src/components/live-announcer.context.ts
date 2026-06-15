import { createContext } from "react";

export type AnnounceFn = (message: string, politeness?: "polite" | "assertive") => void;

/**
 * Shared context for the global aria-live announcer. Kept in a separate
 * non-tsx file so the provider component (live-announcer.tsx) and the hook
 * (live-announcer.hook.ts) can both import it without violating
 * `react-refresh/only-export-components` (Fast Refresh needs
 * component-only files).
 */
export const LiveAnnouncerContext = createContext<AnnounceFn | null>(null);
