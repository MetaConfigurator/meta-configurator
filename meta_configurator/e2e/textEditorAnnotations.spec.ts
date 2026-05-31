import {test, expect, type Page} from '@playwright/test';
import {openApp} from '../../tests/shared/utils';
import {SessionMode} from '../src/store/sessionMode';
import {checkCodeEditorForText, getCodeEditor} from '../../tests/shared/utilsCodeEditor';

/**
 * Reads the validation annotations Ace has rendered on the editor for the given mode.
 * Returns an array of {row (0-indexed), text} for each annotation marker.
 */
async function readAnnotations(
  page: Page,
  mode: SessionMode
): Promise<Array<{row: number; text: string}>> {
  return await page.evaluate(modePrefix => {
    const editor = document.querySelector(`[id^="code-editor-${modePrefix}"]`) as HTMLElement;
    if (!editor) return [];
    const ace = (window as any).ace;
    const aceEditor = ace.edit(editor.id);
    const annotations = aceEditor.getSession().getAnnotations() as Array<{
      row: number;
      text: string;
    }>;
    return annotations.map(a => ({row: a.row, text: a.text}));
  }, mode);
}

test('Text editor shows annotations only at the leaf-error rows, including required-at-root', async ({
  page,
}) => {
  await openApp(
    page,
    'settings_testpanel.json',
    'personInvalid.json',
    'featureTesting.schema.json'
  );

  // wait for data to render
  await checkCodeEditorForText(page, '"heightInMeter"', SessionMode.DataEditor);
  await getCodeEditor(page, SessionMode.DataEditor).waitFor();

  // give validation worker + 500ms annotation debounce time to run
  await page.waitForTimeout(1500);

  const annotations = await readAnnotations(page, SessionMode.DataEditor);

  // Row map for personInvalid.json:
  //   0: {
  //   1:   "heightInMeter": 9.24,
  //   2:   "telephoneNumber": 159,
  //   3:   "isMarried": true,
  //   4:   "address": {
  //   5:     "zipCode": 4
  //   6:   }
  //   7: }
  const rowsWithAnnotations = annotations.map(a => a.row).sort((a, b) => a - b);

  // Expectation: required errors → row 0 (root opening brace), heightInMeter error → row 1,
  // zipCode error → row 5. No annotation on the address row (4) or anywhere else.
  expect(rowsWithAnnotations).toContain(0); // required at root
  expect(rowsWithAnnotations).toContain(1); // heightInMeter
  expect(rowsWithAnnotations).toContain(5); // address/zipCode

  // No annotation on the address line (it would be a parent-level summary that we now filter out)
  expect(rowsWithAnnotations).not.toContain(4);
});
