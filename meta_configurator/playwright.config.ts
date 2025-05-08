import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'e2e',
    timeout: 30 * 1000,
    retries: 0,
    use: {
        headless: true,
        baseURL: 'http://localhost:5173',
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        trace: 'on-first-retry',
    },
});