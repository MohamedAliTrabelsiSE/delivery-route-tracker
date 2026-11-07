import { defineConfig, devices } from '@playwright/test';

const apiPort = 3099;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:8081',
  },
  webServer: [
    {
      command: 'npm run start:e2e -w @tracker/api',
      url: `http://127.0.0.1:${apiPort}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: String(apiPort),
        ROUTING_PROVIDER: 'mock',
        GEOCODING_PROVIDER: 'mock',
        SIMULATE_DRIVER: 'true',
        SIMULATOR_INTERVAL_MS: '1000',
        POSITION_MIN_INTERVAL_MS: '0',
        POSITION_MIN_MOVE_KM: '0',
      },
    },
    {
      command: 'npm run web:e2e -w @tracker/mobile',
      url: 'http://127.0.0.1:8081',
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`,
        BROWSER: 'none',
        EXPO_NO_TELEMETRY: '1',
        CI: '1',
      },
    },
  ],
});
