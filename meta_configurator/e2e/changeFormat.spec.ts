import { test, expect } from '@playwright/test';
import {
    checkCodeEditorForText,
    forceDataFormat,
    getCurrentDataFormat,
    openApp,
    selectInitialSchemaFromExamples
} from "./utils";
import {SessionMode} from "../src/store/sessionMode";


test('Select an example schema, enter some value and change the data format. Then check the code editor content for the data in the new format.', async ({ page }) => {
    // Go to the app
    await openApp(page)

    // Select the "Autonomous Vehicle Schema" from the example schema options
    await selectInitialSchemaFromExamples(page, 'Autonomous Vehicle Schema');

    // Enter some values in the textboxes
    await page.getByRole('textbox', { name: 'SimulationName' }).click();
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('TestName');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');

    // Check that the code editor shows the correct JSON data
    await checkCodeEditorForText(page, '{ "SimulationName": "TestName"}', SessionMode.DataEditor);

    // Expect the data format to be in JSON
    expect(await getCurrentDataFormat(page)).toBe('json');

    // Change the data format to YAML and check that the code editor shows the correct YAML data
    await forceDataFormat(page, 'yaml');
    expect(await getCurrentDataFormat(page)).toBe('yaml');
    await checkCodeEditorForText(page, 'SimulationName: TestName', SessionMode.DataEditor);

    // Change the data format to XML and check that the code editor shows the correct XML data
    await forceDataFormat(page, 'xml');
    expect(await getCurrentDataFormat(page)).toBe('xml');
    await checkCodeEditorForText(page, '<SimulationName>TestName</SimulationName>', SessionMode.DataEditor);

    // Change the data format to JSON
    await forceDataFormat(page, 'json');
    expect(await getCurrentDataFormat(page)).toBe('json');

    // Edit the simulation name in the code editor to an invalid value
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('Sim1');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');
    // TODO: check that there is an error highlighting in the GUI due to invalid SimulationName

    // Edit the simulation name in the code editor to a valid value
    await page.getByRole('textbox', { name: 'SimulationName' }).fill('Sim_2');
    await page.getByRole('textbox', { name: 'SimulationName' }).press('Enter');

    // Check that the code editor shows the correct JSON data
    await checkCodeEditorForText(page, '{ "SimulationName": "Sim_2"}', SessionMode.DataEditor);
});
