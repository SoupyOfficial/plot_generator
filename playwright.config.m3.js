import { defineConfig, devices } from "@playwright/test";

// Special config for M3 seed-promise-flow test
// Uses dev server instead of production build to avoid storage adapter initialization issues
const PORT = 5173; // Vite dev server default port
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/seed-promise-flow.spec.js", //  Only run this test with this config
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: "list",
  retries: 0,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Use dev server instead of production build
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true, // Allow reusing existing dev server
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
