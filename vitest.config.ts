import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/hooks/**", "src/lib/**", "src/components/live-announcer.tsx"],
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 },
    },
  },
});