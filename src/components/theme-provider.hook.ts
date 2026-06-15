import { createContext, useContext } from "react";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export { ThemeCtx };

/**
 * Hook: subscribe to the current theme + toggle function. Kept in a
 * separate non-tsx file so `ThemeProvider` (theme-provider.tsx) can be a
 * pure component file for Fast Refresh.
 */
export const useTheme = () => useContext(ThemeCtx);
