import { test, expect } from '@playwright/test';
import {
    checkCodeEditorForText,
    checkToolbarTitleForText,
    getCurrentEditorMode,
    getSchemaTitle,
    openApp,
    openAppWithMode
} from "./e2eUtils";
import {SessionMode} from "../src/store/sessionMode";

test('Open the app and check that the initial mode is Data Editor', async ({ page }) => {
    // 1. Go to the app
    await openApp(page)

    // 2. Check that the current mode is Data Editor
    const currentMode = await getCurrentEditorMode(page)
    expect(currentMode).toBe(SessionMode.DataEditor)
});

test('Open the app in the schema editor mode and check that the initial mode is Schema Editor', async ({ page }) => {
    // 1. Go to the app
    await openAppWithMode(page, SessionMode.SchemaEditor)

    // 2. Check that the current mode is Schema Editor
    const newMode = await getCurrentEditorMode(page)
    expect(newMode).toBe(SessionMode.SchemaEditor)
});

test('Open the app in the settings mode and check that the initial mode is Settings', async ({ page }) => {
    // 1. Go to the app
    await openAppWithMode(page, SessionMode.Settings)

    // 2. Check that the current mode is Settings
    const newMode = await getCurrentEditorMode(page)
    expect(newMode).toBe(SessionMode.Settings)
});



test('Open the app with pre-loaded data, schema and settings', async ({ page }) => {
    // 1. Go to the app with pre-loaded data, schema and settings
    await openApp(page, 'settings_normal.json', 'data_minimal.json', 'schema_minimal.schema.json')

    // 2. Wait for the app to load
    await page.waitForTimeout(1000)

    // 3. Check that the current mode is Data Editor
    const currentMode = await getCurrentEditorMode(page)
    expect(currentMode).toBe(SessionMode.DataEditor)

    // 4. Check that the data is loaded correctly
    await checkCodeEditorForText(page, '{ "name": "Alex", "age": 25}', SessionMode.DataEditor);

    // 5. Check that the correct schema is loaded via the schema title
    const schemaTitle = await getSchemaTitle(page);
    expect(schemaTitle).toBe('Person');

    // 6. Check that the settings are loaded correctly using the toolbar title
    await checkToolbarTitleForText(page, 'Test - Settings Normal');
});

test('Go through the initial schema selection dialog', async ({ page }) => {
    // 1. Go to the app
    await openApp(page)

    // 2. Wait for the dialog with "Select your preferences" to appear
    await expect(page.getByText('Select a Schema')).toBeVisible()

    // 3. Click the button with "Example Schema"
    await page.getByRole('button', { name: 'Example Schema' }).click()
});