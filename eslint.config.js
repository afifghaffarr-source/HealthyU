import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

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
  eslintPluginPrettier,
  {
    // Tunable constants live in src/lib/constants.ts. Every new export MUST
    // be added to the "What it controls" table in the file header. ESLint
    // can't introspect leading comments via selectors, so this rule fires
    // a warning on EVERY new `export const` to force the author to look at
    // the doc table before merging.
    files: ["src/lib/constants.ts"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "ExportNamedDeclaration > VariableDeclaration",
          message:
            "constants.ts: pastikan konstanta ini sudah ditambahkan ke tabel doc di header file (lalu // eslint-disable-next-line no-restricted-syntax pada baris ini).",
        },
      ],
    },
  },
);
