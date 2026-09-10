import {test, expect} from '@playwright/test';
import {openApp} from '../../tests/shared/utils';
import {SessionMode} from '../src/store/sessionMode';
import {checkCodeEditorForText, forceCodeEditorText} from '../../tests/shared/utilsCodeEditor';

test.use({
  permissions: ['clipboard-read', 'clipboard-write'],
});

async function readClipboard(page: import('@playwright/test').Page): Promise<string> {
  return await page.evaluate(() => navigator.clipboard.readText());
}

test('Copy to clipboard works when data in editor is valid', async ({page}) => {
  await openApp(page, 'settings_testpanel.json', 'data_minimal.json', 'schema_minimal.schema.json');

  // wait for the data to load
  await checkCodeEditorForText(page, '"name": "Alex"', SessionMode.DataEditor);

  // pre-clear the clipboard
  await page.evaluate(() => navigator.clipboard.writeText(''));

  await page.getByTestId(`copy-to-clipboard-${SessionMode.DataEditor}`).click();

  const clipboardText = await readClipboard(page);
  expect(JSON.parse(clipboardText)).toEqual({name: 'Alex', age: 25});
});

test('Copy to clipboard works when data in editor is unparsable', async ({page}) => {
  await openApp(page, 'settings_testpanel.json', 'data_minimal.json', 'schema_minimal.schema.json');

  // wait for the data to load
  await checkCodeEditorForText(page, '"name": "Alex"', SessionMode.DataEditor);

  // write invalid JSON (missing closing brace) into the text editor
  const invalidJson = '{ "name": "Alex", "age": 25';
  await forceCodeEditorText(page, invalidJson, SessionMode.DataEditor);

  // pre-clear the clipboard
  await page.evaluate(() => navigator.clipboard.writeText(''));

  await page.getByTestId(`copy-to-clipboard-${SessionMode.DataEditor}`).click();

  const clipboardText = await readClipboard(page);
  // the invalid string should be on the clipboard (verbatim what's in the editor)
  expect(clipboardText).toContain('"name": "Alex"');
  expect(clipboardText).toContain('"age": 25');
  // and it should be unparsable
  expect(() => JSON.parse(clipboardText)).toThrow();
});

test('Copy to clipboard works when data in editor is empty (unparsable empty string)', async ({page}) => {
  await openApp(page, 'settings_testpanel.json', 'data_minimal.json', 'schema_minimal.schema.json');

  // wait for the data to load
  await checkCodeEditorForText(page, '"name": "Alex"', SessionMode.DataEditor);

  // clear the editor (becomes empty string, which is unparsable as JSON)
  await forceCodeEditorText(page, '', SessionMode.DataEditor);

  // pre-clear the clipboard
  await page.evaluate(() => navigator.clipboard.writeText('PRECLEAR'));

  await page.getByTestId(`copy-to-clipboard-${SessionMode.DataEditor}`).click();

  const clipboardText = await readClipboard(page);
  // the editor has empty/near-empty content - clipboard should reflect that, not the old data
  expect(clipboardText).not.toContain('Alex');
  expect(clipboardText).not.toBe('PRECLEAR');
});
