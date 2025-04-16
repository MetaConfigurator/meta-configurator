import { SessionMode} from "../src/store/sessionMode";
import {Page} from "playwright";
import {expect} from "@playwright/test";


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
