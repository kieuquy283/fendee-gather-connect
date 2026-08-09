import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/backend",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-d2-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
