import { test, expect } from '@playwright/test';
import {
    checkSchemaTitleForText,
    checkToolbarTitleForText,
    getCurrentEditorMode,
    openApp,
    openAppWithMode
} from "./utils";
import {SessionMode} from "../src/store/sessionMode";
import {tpGetData} from "./utilsTestPanel";

test('Open the app and check that the initial mode is Data Editor', async ({ page }) => {
    // Go to the app
    await openApp(page)

    // Check that the current mode is Data Editor
    const currentMode = await getCurrentEditorMode(page)
    expect(currentMode).toBe(SessionMode.DataEditor)
});

test('Open the app in the schema editor mode and check that the initial mode is Schema Editor', async ({ page }) => {
    // Go to the app
    await openAppWithMode(page, SessionMode.SchemaEditor)

    // Check that the current mode is Schema Editor
    const newMode = await getCurrentEditorMode(page)
    expect(newMode).toBe(SessionMode.SchemaEditor)
});

test('Open the app in the settings mode and check that the initial mode is Settings', async ({ page }) => {
    // Go to the app
    await openAppWithMode(page, SessionMode.Settings)

    // Check that the current mode is Settings
    const newMode = await getCurrentEditorMode(page)
    expect(newMode).toBe(SessionMode.Settings)
});



test('Open the app with pre-loaded data, schema and settings', async ({ page }) => {
    // Go to the app with pre-loaded data, schema and settings
    await openApp(page, 'settings_testpanel.json', 'data_minimal.json', 'schema_minimal.schema.json')

    // Wait for the app to load
    await page.waitForTimeout(2000)

    // Check that the current mode is Data Editor
    const currentMode = await getCurrentEditorMode(page)
    expect(currentMode).toBe(SessionMode.DataEditor)

    // Check that the data is loaded correctly
    const currentData = await tpGetData(page, SessionMode.DataEditor);
    expect(currentData).toEqual({ name: 'Alex', age: 25 });

    // Check that the correct schema is loaded via the schema title
    await checkSchemaTitleForText(page, 'Person');

    // Check that the settings are loaded correctly using the toolbar title
    await checkToolbarTitleForText(page, 'Test');
});

test('Go through the initial schema selection dialog', async ({ page }) => {
    // Go to the app
    await openApp(page)

    // Wait for the dialog with "Select your preferences" to appear
    await expect(page.getByText('Select a Schema')).toBeVisible()

    // Click the button with "Example Schema"
    await page.getByRole('button', { name: 'Example Schema' }).click()
});