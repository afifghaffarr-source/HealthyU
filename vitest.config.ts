import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
    // Injects stub VITE_* env vars before any test runs. Needed for
    // modules that validate env at import time (see src/lib/env.ts).
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/hooks/**", "src/lib/**", "src/components/live-announcer.tsx"],
      exclude: [
        // serverFn / server-only modules are exercised via integration tests,
        // not jsdom unit tests — exclude from coverage thresholds.
        "src/lib/**/*.functions.ts",
        "src/lib/**/*.functions.tsx",
        "src/lib/**/*.server.ts",
        "src/lib/**/*.server.tsx",
      ],
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 },
    },
  },
});
