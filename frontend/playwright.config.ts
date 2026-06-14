import { defineConfig, devices } from '@playwright/test'

const localBase = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: localBase,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm build && pnpm exec vite preview --port 4173 --host 127.0.0.1',
    url: localBase,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
})
