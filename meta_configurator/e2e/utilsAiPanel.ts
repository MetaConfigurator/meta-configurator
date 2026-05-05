import {Page} from 'playwright';
import {expect} from '@playwright/test';

export async function aiPanelEnterCreatePrompt(page: Page, prompt: string) {
    const textarea = page.getByTestId('ai-prompt-create-input');
    await expect(textarea).toBeVisible();
    await textarea.fill(prompt);
}

export async function aiPanelSubmitCreate(page: Page) {
    const button = page.getByTestId('ai-prompt-create-submit');
    await expect(button).toBeVisible();
    await button.click();
}
