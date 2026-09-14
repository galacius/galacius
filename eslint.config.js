import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/dist/**", "**/wailsjs/**"]),
  {
    files: [
      "frontend/src/**/*.{ts,tsx}",
      "packages/design-system/src/**/*.{ts,tsx}",
      "packages/core/frontend/src/**/*.{ts,tsx}",
    ],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "frontend/src/**/__tests__/**/*.{ts,tsx}",
      "frontend/src/**/*.test.{ts,tsx}",
      "packages/design-system/src/**/__tests__/**/*.{ts,tsx}",
      "packages/design-system/src/**/*.test.{ts,tsx}",
      "packages/core/frontend/src/**/__tests__/**/*.{ts,tsx}",
      "packages/core/frontend/src/**/*.test.{ts,tsx}",
    ],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
