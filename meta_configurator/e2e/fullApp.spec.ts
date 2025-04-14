import { test, expect } from '@playwright/test';

test('opens MetaConfigurator and go through initial schema selection dialog', async ({ page }) => {
    // 1. Go to the app
    await page.goto('http://localhost:5173')

    // 2. Wait for the dialog with "Select a Schema" to appear
    await expect(page.getByText('Select your Preferences')).toBeVisible()

    // 3. Click the button with "Example Schema"
    await page.getByRole('button', { name: 'Submit' }).click()
});
