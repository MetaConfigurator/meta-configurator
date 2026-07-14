import {test, expect} from '@playwright/test';
import {openApp} from '../../tests/shared/utils';
import {SessionMode} from '../src/store/sessionMode';
import {tpForceData, tpGetCurrentPath, tpGetData} from '../../tests/shared/utilsTestPanel';
import {addArrayItem, checkStringProperty, editStringProperty} from '../../tests/shared/utilsGuiEditor';

/**
 * Regression test for the "schema with type array on root level does not work" bug:
 * the GUI view stayed completely empty for a root-level array schema as long as the
 * document data was still the initial empty object, and afterwards data writes for
 * root-level items went to wrong locations.
 */
test('root level array schema can be filled and edited via the GUI editor', async ({page}) => {
  await openApp(page, 'settings_testpanel.json', null, 'schema_rootarray.schema.json');

  // a new document starts out with an empty object as data
  expect(await tpGetData(page, SessionMode.DataEditor)).toEqual({});

  // the GUI view must offer adding an item nonetheless
  await addArrayItem(page, []);
  await expect.poll(async () => tpGetData(page, SessionMode.DataEditor)).toEqual([{}]);

  // the new item can be edited
  await editStringProperty(page, [0, 'name'], 'Alex');
  await expect
    .poll(async () => tpGetData(page, SessionMode.DataEditor))
    .toEqual([{name: 'Alex'}]);

  // more items can be appended
  await addArrayItem(page, []);
  await expect
    .poll(async () => tpGetData(page, SessionMode.DataEditor))
    .toEqual([{name: 'Alex'}, {}]);
});

test('add item replaces leftover non-array data of a root level array', async ({page}) => {
  await openApp(page, 'settings_testpanel.json', null, 'schema_rootarray.schema.json');

  // simulate old data from a previous schema
  await tpForceData(page, SessionMode.DataEditor, {legacy: 'value'});

  // the GUI still offers adding an item; clicking it replaces the old data
  await addArrayItem(page, []);
  await expect.poll(async () => tpGetData(page, SessionMode.DataEditor)).toEqual([{}]);
});

test('zooming into an item of a root level array works', async ({page}) => {
  await openApp(page, 'settings_testpanel.json', null, 'schema_rootarray.schema.json');

  await addArrayItem(page, []);
  await editStringProperty(page, [0, 'name'], 'Alex');

  // zoom into the first item by clicking its label
  await page.locator('[id="_label_[0]"]').click();
  expect(await tpGetCurrentPath(page, SessionMode.DataEditor)).toEqual([0]);

  // the item's properties are shown and editable at the zoomed level
  await checkStringProperty(page, [0, 'name'], 'Alex');
});
