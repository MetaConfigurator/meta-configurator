import {expect, type Page} from './playwright';
import type {JsonSchemaType} from '../../meta_configurator/src/schema/jsonSchemaType';
import type {CompositionKind} from './schemaSelectionFixtures';
import {openApp} from './utils';
import {tpGetData, tpGetSchema} from './utilsTestPanel';
import {SessionMode} from '../../meta_configurator/src/store/sessionMode';

/** Serve each case through the ordinary schema/data loading flow. */
export async function openSelectionSchema(page: Page, schema: JsonSchemaType, data: unknown = {}) {
  await page.route('**/test-fixtures/selection-case.schema.json', route =>
    route.fulfill({json: schema})
  );
  await page.route('**/test-fixtures/selection-case.json', route => route.fulfill({json: data}));
  await openApp(
    page,
    'settings_testpanel.json',
    'selection-case.json',
    'selection-case.schema.json'
  );
  await expect(page).toHaveURL(/\/data$/);
  await expect.poll(() => tpGetSchema(page, SessionMode.DataEditor)).toEqual(schema);
  await expect.poll(() => tpGetData(page, SessionMode.DataEditor)).toEqual(data);
}

/** Steps are numbered within one data path, from the outermost selector inward. */
export function schemaSelectors(page: Page, path: string) {
  return page.getByTestId(`property-data-${path}`).locator('.p-select, .p-multiselect');
}

export async function chooseSchemaOption(
  page: Page,
  path: string,
  step: number,
  name: string,
  kind: CompositionKind
) {
  const selector = schemaSelectors(page, path).nth(step);
  await expect(selector).toBeVisible();
  const option = page.getByRole('option', {name, exact: true});
  // Opening the control also selects its tree row. That can queue a tree rebuild
  // which replaces the control and closes its overlay. Let that work render, and
  // reopen if necessary. Only retry opening: retrying an anyOf toggle could undo it.
  await expect(async () => {
    if (!(await option.isVisible())) await selector.click({timeout: 1500});
    await page.evaluate(
      () =>
        new Promise<void>(resolve =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );
    await expect(option).toBeVisible({timeout: 1000});
  }).toPass({timeout: 5000});
  await option.click({timeout: 5000});
  // MultiSelect can stay open after toggling an option. Close it before the next
  // interaction; ordinary pointer/keyboard events retain Playwright's actionability checks.
  if (kind === 'anyOf') await page.keyboard.press('Escape');
  await expect(option).not.toBeVisible();
}

/** Expand a data node through the same tree control a user would click. */
export async function expandSchemaNode(page: Page, path: string) {
  const row = page
    .getByRole('row')
    .filter({has: page.getByTestId(`property-data-${path}`)})
    .first();
  await expect(row).toBeVisible();
  if ((await row.getAttribute('aria-expanded')) !== 'true') {
    await row.getByRole('button').first().click();
  }
  await expect(row).toHaveAttribute('aria-expanded', 'true');
}
