import {modeToMenuTitle, modeToRoute, SessionMode} from "../src/store/sessionMode";
import {Page} from "playwright";
import {expect} from "@playwright/test";

const dataFormats = [ 'json', 'yaml', 'xml' ];


export async function getCurrentEditorMode(page: Page): Promise<SessionMode> {
    const text = await page.getByRole('toolbar').innerText();

    for (const mode of Object.values(SessionMode)) {
        if (text.includes(modeToMenuTitle(mode))) {
            return mode;
        }
    }
    throw new Error('Unable to detect editor mode');
}

export async function forceEditorMode(page: Page, newMode: SessionMode) {
    const currentMode = await getCurrentEditorMode(page);
    const newModeTitle = modeToMenuTitle(newMode);
    const currentModeTitle = modeToMenuTitle(currentMode);

    if (currentMode !== newMode) {

        await page.getByRole('button', { name: currentModeTitle }).click();
        await page.getByRole('menuitem', { name: newModeTitle }).locator('a').click();
    }
}

export async function openApp(page: Page, initialSettings: string|null = null, initialData: string|null = null, initialSchema: string|null = null) {
    const testFilesPath = "test-fixtures"
    const url = new URL('http://localhost:5173/');
    if (initialSettings) {
        url.searchParams.append('settings', testFilesPath + '/' + initialSettings);
    }
    if (initialData) {
        url.searchParams.append('data', testFilesPath + '/' + initialData);
    }
    if (initialSchema) {
        url.searchParams.append('schema', testFilesPath + '/' + initialSchema);
    }
    await page.goto(url.toString());
}

export async function openAppWithMode(page: Page, mode: SessionMode) {
    const route = modeToRoute(mode)
    const url = new URL('http://localhost:5173' + route);
    await page.goto(url.toString());
}

export async function readCodeEditorText(page: Page, mode: SessionMode|""="") {
    const codeEditor = getCodeEditor(page, mode);
    return await codeEditor.innerText();
}

export async function checkCodeEditorForText(page: Page, text: string, mode: SessionMode|""="") {
    return await expect(getCodeEditor(page, mode)).toContainText(text);
}

export function getCodeEditor(page: Page, mode: SessionMode|""="") {
    return page.locator(`[id^="code-editor-${mode}"]`);
}

export async function getSchemaTitle(page: Page) {
    // this is an example of how to access the component when the schema is called Person: await page.getByText('GUI Editor Schema: Person')
    const schemaTitle = page.getByText('GUI Editor Schema:');
    const schemaTitleText = await schemaTitle.innerText();
    const schemaTitleTextArray = schemaTitleText.split(':');
    return schemaTitleTextArray[1].trim();
}

export async function checkToolbarTitleForText(page: Page, text: string) {
    await expect(page.getByRole('paragraph')).toContainText(text);
}

export async function selectInitialSchemaFromExamples(page: Page, schemaName: string) {
    await expect(page.getByText('Select a Schema')).toBeVisible()

    // Wait for the page to load and select the "Example Schema" from the dropdown
    await page.getByRole('button', { name: 'Example Schema' }).click();

    // Select the schema from the example schema options
    await page.getByRole('option', { name: schemaName }).click();
}

export async function getCurrentDataFormat(page: Page): Promise<string> {
    const dataFormatText = await page.getByTestId('format-selector').innerText();
    for (let format of dataFormats) {
        if (dataFormatText.includes(format)) {
            return format;
        }
    }
    throw new Error('Unable to detect data format');
}

export async function forceDataFormat(page: Page, newFormat: string) {
    const currentFormat = await getCurrentDataFormat(page);
    if (currentFormat !== newFormat) {
        const formatSelector = page.getByTestId('format-selector');
        await formatSelector.getByRole('combobox', { name: currentFormat }).click();
        await page.getByRole('option', { name: newFormat }).click();
    }
}