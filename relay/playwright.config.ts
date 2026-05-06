import { defineConfig } from '../tests/shared/playwright';

export default defineConfig({
    testDir: 'tests',
    testMatch: 'systemTest.relay.spec.ts',
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
