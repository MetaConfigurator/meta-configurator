import {expect, test} from '@playwright/test';
import {openApp} from '../../tests/shared/utils';
import {tpGetData} from '../../tests/shared/utilsTestPanel';
import {SessionMode} from '../src/store/sessionMode';

const GENERATED_JAVASCRIPT_MAPPING = [
  'function transform(input) {',
  "  return {fullName: input.first_name + ' ' + input.last_name};",
  '}',
].join('\n');
const MOCKED_LLM_RESPONSE = `\`\`\`javascript\n${GENERATED_JAVASCRIPT_MAPPING}\n\`\`\``;

test('maps data with a JavaScript function generated from an inferred source schema', async ({
  page,
}) => {
  await page.route('**/chat/completions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{message: {content: MOCKED_LLM_RESPONSE}}],
      }),
    });
  });

  await openApp(
    page,
    'settings_aipanel.json',
    'data_mapping_source.json',
    'data_mapping_target.schema.json'
  );

  await page.locator('#utility').click();
  await page
    .getByRole('menuitem', {name: 'Transform Data to match the Schema...'})
    .click();

  const dialog = page.getByRole('dialog', {name: 'Convert Data to Target Schema'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox').first().click();
  await page
    .getByRole('option', {
      name: 'Generate Mapping Function based on inferred source schema and target schema',
    })
    .click();
  await expect(dialog.getByRole('combobox').nth(1)).toContainText('JavaScript');

  const aiRequestPromise = page.waitForRequest('**/chat/completions');
  await dialog.getByRole('button', {name: 'Generate Suggestion'}).click();
  const aiRequest = await aiRequestPromise;
  const requestMessages = aiRequest.postDataJSON().messages as {
    role: string;
    content: string;
  }[];
  const userMessage = requestMessages[1]!.content;

  expect(userMessage).toContain('SOURCE INPUT SCHEMA');
  expect(userMessage).toContain('"first_name"');
  expect(userMessage).toContain('"examples":["Ada"]');
  expect(userMessage).toContain('TARGET OUTPUT SCHEMA');
  expect(userMessage).toContain('"fullName"');
  expect(userMessage).not.toContain('REAL INPUT DATA SUBSET');

  await dialog.getByRole('button', {name: 'Perform Mapping'}).click();
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(() => tpGetData(page, SessionMode.DataEditor))
    .toEqual({fullName: 'Ada Lovelace'});
});
