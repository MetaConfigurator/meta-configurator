import {expect, test, type Page} from '@playwright/test';
import {forceEditorMode, openApp} from '../../tests/shared/utils';
import {SessionMode} from '../src/store/sessionMode';

function panelToggleButton(page: Page, icon: string) {
  return page
    .locator('.toolbar-top .toolbar-menu-buttons')
    .locator('button')
    .filter({has: page.locator(`svg[data-icon="${icon}"]`)});
}

test.beforeEach(async ({page}) => {
  await openApp(page);
});

test('an open view can be closed and reopened from the menu bar', async ({page}) => {
  const panels = page.locator('#mainpanel .p-splitterpanel');
  const textViewButton = panelToggleButton(page, 'code');

  await expect(panels).toHaveCount(2);
  await expect(textViewButton).toHaveClass(/highlighted-icon/);

  await textViewButton.click();

  await expect(panels).toHaveCount(1);
  await expect(textViewButton).not.toHaveClass(/highlighted-icon/);

  await textViewButton.click();

  await expect(panels).toHaveCount(2);
  await expect(textViewButton).toHaveClass(/highlighted-icon/);
});

test('a closed view can be opened and closed from the menu bar', async ({page}) => {
  const panels = page.locator('#mainpanel .p-splitterpanel');
  const tableViewButton = panelToggleButton(page, 'table');

  await expect(panels).toHaveCount(2);
  await expect(tableViewButton).not.toHaveClass(/highlighted-icon/);

  await tableViewButton.click();

  await expect(panels).toHaveCount(3);
  await expect(tableViewButton).toHaveClass(/highlighted-icon/);

  await tableViewButton.click();

  await expect(panels).toHaveCount(2);
  await expect(tableViewButton).not.toHaveClass(/highlighted-icon/);
});

test('the panel layout follows a full settings replacement', async ({page}) => {
  await openApp(page, 'settings_testpanel.json');
  await forceEditorMode(page, SessionMode.Settings);

  const panels = page.locator('#mainpanel .p-splitterpanel');
  await expect(panels).toHaveCount(3);

  await page.locator('#settings_restore').click();

  await expect(panels).toHaveCount(2);
});
