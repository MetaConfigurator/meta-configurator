import { SessionMode} from "../src/store/sessionMode";
import {Page} from "playwright";
import {expect} from "@playwright/test";
import {selectAll} from "./utils";


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

export async function forceCodeEditorText(page: Page, text: string, mode: SessionMode|""="") {
    const codeEditor = getCodeEditor(page, mode);
    await codeEditor.click();
    // first clean old content by selecting all and then pressing delete key
    await selectAll(page);
    await codeEditor.press('Backspace');

    // Simulate real typing
    for (const char of text) {
        await page.keyboard.press(char);
    }

    await codeEditor.press('Enter');

    // click somewhere else to trigger the change event
    await page.getByTestId('toolbar-title').click();

    // wait 1 second
    await page.waitForTimeout(1000);
}