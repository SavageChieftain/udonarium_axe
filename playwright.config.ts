import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  // CI: 1 worker (sequential). Local: 2 workers to avoid WSL2 OOM.
  workers: isCI ? 1 : 2,
  reporter: 'html',
  // Per-test timeout (60s to account for slow WSL2 startup).
  timeout: 60000,
  // Visual regression: screenshot diff must be near-pixel-perfect.
  // - maxDiffPixels: 50 pixels of tolerance for font/AA edge cases.
  // - threshold: 0.15 per-channel allowance to absorb OS font rendering.
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 50,
      threshold: 0.15,
    },
  },
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    // Action/navigation timeouts to prevent indefinite hangs.
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and WebKit are only run in CI to reduce local resource usage.
    ...(isCI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !isCI,
  },
});
