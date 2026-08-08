import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static assets served as-is (including the vendored Luau WASM glue).
    "public/**",
    // Plain Node scripts run outside the Next.js/TypeScript toolchain.
    "scripts/**",
    // Capacitor/Android wrapper: generated project + build artifacts.
    "mobile/**",
  ]),
]);

export default eslintConfig;
