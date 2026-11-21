import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  // Fake SMTP inbox (127.0.0.1:2526) so email tests exercise real delivery.
  globalSetup: "./tests/e2e/mail-sink.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Fresh test database every run (rate-limit counters and test orders start clean).
    command: `node -e "require('fs').rmSync('.data/pglite-test',{recursive:true,force:true})" && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Isolated test database; forwarding headers trusted so API tests can simulate distinct clients.
    env: {
      PGLITE_DIR: ".data/pglite-test",
      // Isolated test-mode build (scripts/e2e.mjs): checkout off, test orders with sample wallets.
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_CHECKOUT_TEST_MODE: "1",
      TRUST_PROXY: "1",
      // Deterministic quotes: fixed indicative rates (flagged preview), no network calls.
      RATES_MODE: "fixed",
      // Emails in test mode, all redirected to the fake inbox.
      EMAIL_MODE: "test",
      EMAIL_FROM: "VICE <orders@vice.test>",
      EMAIL_TEST_RECIPIENT: "inbox@vice.test",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "2526",
      SMTP_SECURITY: "none",
      ADMIN_BOOTSTRAP_EMAIL: "owner@vice.test",
      ADMIN_BOOTSTRAP_PASSWORD: "test-owner-password-123",
    },
  },
});
