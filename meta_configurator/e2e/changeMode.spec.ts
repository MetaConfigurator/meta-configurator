import { test, expect } from '@playwright/test';
import {forceEditorMode, getCurrentEditorMode, openApp} from "./utils";
import {SessionMode} from "../src/store/sessionMode";


test('Change the mode to Schema Editor', async ({ page }) => {
    // Go to the app
    await openApp(page);

    // Check that the current mode is Data Editor
    const currentMode = await getCurrentEditorMode(page);
    expect(currentMode).toBe(SessionMode.DataEditor);

    // Change the mode to Schema Editor
    await forceEditorMode(page, SessionMode.SchemaEditor);

    // Check that the current mode is Schema Editor
    const newMode = await getCurrentEditorMode(page);
    expect(newMode).toBe(SessionMode.SchemaEditor);
});

test('Change the mode to Settings Editor', async ({ page }) => {
    // Go to the app
    await openApp(page);

    // Check that the current mode is Data Editor
    const currentMode = await getCurrentEditorMode(page);
    expect(currentMode).toBe(SessionMode.DataEditor);

    // Change the mode to Settings
    await forceEditorMode(page, SessionMode.Settings);

    // Check that the current mode is Settings
    const newMode = await getCurrentEditorMode(page);
    expect(newMode).toBe(SessionMode.Settings);
});
