import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const isAuthenticatedE2E = process.env.E2E_AUTHENTICATED === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const authStorageFile = path.join(__dirname, 'test-results/.auth/user.json');

const projects = [
  {
    name: 'public-chromium',
    testMatch: /.*\.public\.spec\.ts/,
    use: {
      ...devices['Desktop Chrome'],
      storageState: { cookies: [], origins: [] },
    },
  },
  ...(isAuthenticatedE2E
    ? [
        {
          name: 'auth-setup',
          testMatch: /auth\.setup\.ts/,
          use: {
            ...devices['Desktop Chrome'],
          },
        },
        {
          name: 'authenticated-chromium',
          dependencies: ['auth-setup'],
          testIgnore: [/.*\.public\.spec\.ts/, /auth\.setup\.ts/],
          use: {
            ...devices['Desktop Chrome'],
            storageState: authStorageFile,
          },
        },
      ]
    : []),
];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isAuthenticatedE2E,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: isAuthenticatedE2E ? 1 : 2,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects,
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
