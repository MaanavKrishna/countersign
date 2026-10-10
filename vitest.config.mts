import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "test/server-only-stub.ts") } },
  // Load .env.local so the opt-in eval can reach the model API.
  test: { include: ["src/**/*.test.ts"], env: loadEnv("", process.cwd(), "") },
});
