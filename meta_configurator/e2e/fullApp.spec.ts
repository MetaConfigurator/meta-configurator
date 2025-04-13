import { test, expect } from '@playwright/test';

test('opens MetaConfigurator and go through initial schema selection dialog', async ({ page }) => {
    // 1. Go to the app
    await page.goto('http://localhost:5173')

    // 2. Wait for the dialog with "Select a Schema" to appear
    await expect(page.getByText('Select your Preferences')).toBeVisible()

    // 3. Click the button with "Example Schema"
    await page.getByRole('button', { name: 'Submit' }).click()
});

test('Test different things', async ({ page }) => {



    await page.goto('http://localhost:5173/data');
    await page.getByText('Select your Preferences').click();
    await page.getByRole('radio', { name: 'Yes Create, Modify or Explore' }).check();
    await page.locator('#no').nth(1).check();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('button', { name: 'Example Schema' }).click();
    await page.getByRole('option', { name: 'Autonomous Vehicle Schema' }).click();
    await page.getByRole('textbox', { name: 'SimulationName' }).click();
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('TestName');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: '{ "SimulationName": "TestName' }).nth(1).click();
    await page.getByRole('combobox', { name: 'json' }).click();
    await page.getByText('yaml').click();
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: /^SimulationName: TestName$/ }).nth(1).click();
    await page.getByRole('combobox', { name: 'yaml' }).click();
    await page.getByRole('option', { name: 'xml' }).click();
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: /^<SimulationName>TestName<\/SimulationName>$/ }).nth(1).click();
    await page.getByRole('combobox', { name: 'xml' }).click();
    await page.getByRole('option', { name: 'json' }).click();
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('Sim1');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('Sim_2');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: '{ "SimulationName": "Sim_2"}' }).nth(1).click();
    await page.getByRole('button', { name: ' Add item (PedestrianGroups)' }).click();
    await page.getByRole('cell', { name: 'Count : integer' }).locator('button').nth(1).click();
    await page.getByRole('cell', { name: 'Speed* : number' }).locator('button').nth(1).click();
    await page.getByRole('cell', { name: 'Path* : array 0 items' }).getByRole('button').click();
    await page.getByRole('cell', { name: ' Add Name of a waypoint' }).locator('span').first().click();
    await page.getByRole('textbox', { name: 'Name of a waypoint' }).click();
    await page.getByRole('textbox', { name: 'Name of a waypoint' }).fill('Test');
    await page.getByRole('textbox', { name: 'Name of a waypoint' }).press('Enter');
    await page.locator('[id^="code-editor-dataEditor-"] div').filter({ hasText: '{ "SimulationName": "Sim_2' }).nth(1).click();


});