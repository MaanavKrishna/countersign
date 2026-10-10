import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Forbid a folder from importing the listed lib modules. */
function boundary(files, banned, why) {
  return [{
    files: [files],
    ignores: ["**/__tests__/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: banned.flatMap((m) => [`@/lib/${m}`, `@/lib/${m}/*`]), message: why }] }],
    },
  }];
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Module boundaries (see docs/ARCHITECTURE.md). Each rule lists what a module may NOT import.
  ...boundary("src/lib/core/**", ["family", "investigator", "shield", "ai", "server", "channels", "telemetry", "eval"],
    "core is the shared, pure base: it imports nothing else."),
  ...boundary("src/lib/family/**", ["investigator", "shield", "ai", "server", "channels", "telemetry", "eval"],
    "Family Countersign must work offline on the phone: no AI, no server code."),
  ...boundary("src/lib/shield/**", ["investigator", "channels", "eval", "family"],
    "Call Shield does not depend on the message investigator or the family protocol."),
  ...boundary("src/lib/investigator/**", ["family", "shield", "channels", "eval"],
    "The investigator knows nothing about channels, families or calls."),
  ...boundary("src/lib/telemetry/**", ["family", "investigator", "shield", "ai", "server", "channels", "eval"],
    "Telemetry only scrubs and reports; it must never see app data."),
  {
    files: ["src/components/**", "src/app/**/page.tsx", "src/app/**/error.tsx", "src/app/layout.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/lib/ai/*", "@/lib/server/*", "@/lib/channels/*", "@/lib/investigator/pipeline", "@/lib/investigator/agents/*", "@/lib/investigator/tools/*", "@/lib/investigator/report/*", "@/lib/shield/ai"],
          message: "Server-only module: UI code talks to it through an /api route.",
        }],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
