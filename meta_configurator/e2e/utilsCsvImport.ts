import {Page} from 'playwright';
import {expect} from '@playwright/test';
import path from 'node:path';

const fixturesDir = path.resolve(process.cwd(), 'e2e/test-fixtures');

export async function openCsvImportDialog(page: Page) {
    await page.locator('#import-data').click();
    await page.getByRole('menuitem', {name: 'Import CSV Data'}).click();
    await expect(page.getByRole('dialog', {name: 'Import CSV'})).toBeVisible();
}

export async function uploadCsvFile(page: Page, filename: string) {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('csv-select-file').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(fixturesDir, filename));
    // wait for the Import button to appear, confirming the CSV was parsed
    await expect(page.getByTestId('csv-submit-import')).toBeVisible();
}

export async function expandImportOptions(page: Page) {
    await page.getByTestId('csv-import-options-toggle').click();
}

export async function setCsvTablePath(page: Page, tablePath: string) {
    const input = page.getByTestId('csv-table-path-input');
    await input.clear();
    await input.fill(tablePath);
}

export async function setColumnPath(page: Page, columnName: string, newPath: string) {
    const input = page.getByTestId(`csv-column-path-${columnName}`);
    await input.clear();
    await input.fill(newPath);
}

export async function submitCsvImport(page: Page) {
    await page.getByTestId('csv-submit-import').click();
    await expect(page.getByRole('dialog', {name: 'Import CSV'})).not.toBeVisible();
}
