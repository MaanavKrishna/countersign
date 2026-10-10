import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build (the service worker only registers in production).
// Locally they use the installed Chrome; set PW_BUNDLED=1 to use Playwright's own Chromium (e.g. in CI).
const PORT = 3200;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    channel: process.env.PW_BUNDLED ? undefined : "chrome",
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
