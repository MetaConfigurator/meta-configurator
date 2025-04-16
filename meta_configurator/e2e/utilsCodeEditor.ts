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

    // click on the very top right of the page to remove focus from the code editor
    // this is needed to trigger the change event
    const x = page.viewportSize()?.width || 0;
    const y = page.viewportSize()?.height || 0;
    await page.mouse.click(x - 10, y - 10);

    // wait 1 second
    await page.waitForTimeout(1000);
}