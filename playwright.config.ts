import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Same environment as `next dev`: reads .env.local (Clerk and Supabase keys) without printing it.
loadEnvConfig(process.cwd());

const PORT = 3100;

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 20_000 }, // Open Library search can take a few seconds
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  globalSetup: "./tests/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
