import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import constantsOverride from "./eslint.constants.config.js";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // AUDIT-014 defensive rule: prevent *.tsx (client components) from
    // importing *.server.ts (server-only modules that may contain service
    // role keys, admin clients, and other secrets). The standard pattern
    // is to use *.functions.ts with createServerFn instead, which TanStack
    // Start tree-shakes correctly across the client/server boundary.
    //
    // Verified at audit time: 0 violations in current codebase.
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/*.server", "**/*.server.ts", "**/*.server.tsx"],
              message:
                "Do not import *.server.ts from a .tsx component. Server-only modules contain admin clients, service role keys, and other secrets that would be bundled into the client. Use *.functions.ts (createServerFn) for client-callable server functions.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
  constantsOverride,
);
