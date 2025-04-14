import { test, expect } from '@playwright/test';
import {forceEditorMode, getCurrentEditorMode} from "./e2eUtils";
import {SessionMode} from "../src/store/sessionMode";

test('Go through the initial schema selection dialog', async ({ page }) => {
    // 1. Go to the app
    await page.goto('http://localhost:5173')

    // 2. Wait for the dialog with "Select your preferences" to appear
    await expect(page.getByText('Select a Schema')).toBeVisible()

    // 3. Click the button with "Example Schema"
    await page.getByRole('button', { name: 'Example Schema' }).click()
});

test('Select an example schema, enter some value and change the data format. Then check the code editor content for the data in the new format.', async ({ page }) => {
    // 1. Go to the app
    await page.goto('http://localhost:5173/data');

    // 2. Wait for the page to load and select the "Example Schema" from the dropdown
    await page.getByRole('button', { name: 'Example Schema' }).click();

    // 3. Select the "Autonomous Vehicle Schema" from the example schema options
    await page.getByRole('option', { name: 'Autonomous Vehicle Schema' }).click();

    // 4. Enter some values in the textboxes
    await page.getByRole('textbox', { name: 'SimulationName' }).click();
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('TestName');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');

    // 5. Check that the code editor shows the correct JSON data
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: '{ "SimulationName": "TestName' }).nth(1).click();

    // 6. Change the data format to YAML and check that the code editor shows the correct YAML data
    await page.getByRole('combobox', { name: 'json' }).click();
    await page.getByText('yaml').click();
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: /^SimulationName: TestName$/ }).nth(1).click();

    // 7. Change the data format to XML and check that the code editor shows the correct XML data
    await page.getByRole('combobox', { name: 'yaml' }).click();
    await page.getByRole('option', { name: 'xml' }).click();
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: /^<SimulationName>TestName<\/SimulationName>$/ }).nth(1).click();

    // 8. Change the data format to JSON
    await page.getByRole('combobox', { name: 'xml' }).click();
    await page.getByRole('option', { name: 'json' }).click();

    // 9. Edit the simulation name in the code editor to an invalid value
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('Sim1');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');
    // TODO: check that there is an error highlighting in the GUI due to invalid SimulationName

    // 10. Edit the simulation name in the code editor to a valid value
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('Sim_2');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');

    // 11. Check that the code editor shows the correct JSON data
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: '{ "SimulationName": "Sim_2"}' }).nth(1).click();
});

test('Change the mode to Schema Editor', async ({ page }) => {
    // 1. Go to the app
    await page.goto('http://localhost:5173/data');

    // 2. Check that the current mode is Data Editor
    const currentMode = await getCurrentEditorMode(page);
    expect(currentMode).toBe(SessionMode.DataEditor);

    // 3. Change the mode to Schema Editor
    await forceEditorMode(page, SessionMode.SchemaEditor);

    // 4. Check that the current mode is Schema Editor
    const newMode = await getCurrentEditorMode(page);
    expect(newMode).toBe(SessionMode.SchemaEditor);
});

test('Change the mode to Settings Editor', async ({ page }) => {
    // 1. Go to the app
    await page.goto('http://localhost:5173/data');

    // 2. Check that the current mode is Data Editor
    const currentMode = await getCurrentEditorMode(page);
    expect(currentMode).toBe(SessionMode.DataEditor);

    // 3. Change the mode to Settings
    await forceEditorMode(page, SessionMode.Settings);

    // 4. Check that the current mode is Settings
    const newMode = await getCurrentEditorMode(page);
    expect(newMode).toBe(SessionMode.Settings);
});
