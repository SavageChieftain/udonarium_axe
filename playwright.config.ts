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
  use: {
    baseURL: 'http://localhost:4200',
    // UI 文言を前提にしたアサーションが多いので言語を固定する
    locale: 'ja-JP',
    trace: 'on-first-retry',
    // Action/navigation timeouts to prevent indefinite hangs.
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\/.*\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], reducedMotion: 'reduce' },
      testMatch: /mobile\/.*\.spec\.ts/,
    },
    // Firefox and WebKit are only run in CI to reduce local resource usage.
    ...(isCI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            testIgnore: /mobile\/.*\.spec\.ts/,
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            testIgnore: /mobile\/.*\.spec\.ts/,
          },
          {
            name: 'mobile-safari',
            use: { ...devices['iPhone 14'], reducedMotion: 'reduce' },
            testMatch: /mobile\/.*\.spec\.ts/,
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
