import {modeToMenuTitle, SessionMode} from "../src/store/sessionMode";
import {Page} from "playwright";


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