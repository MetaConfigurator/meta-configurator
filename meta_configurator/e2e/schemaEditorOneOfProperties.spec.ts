import {test, expect} from '@playwright/test';
import {forceEditorMode, openApp} from '../../tests/shared/utils';
import {SessionMode} from '../src/store/sessionMode';
import {
  tpForceCurrentPath,
  tpForceData,
  tpGetData,
} from '../../tests/shared/utilsTestPanel';
import {
  addArrayItem,
  checkPropertyExistence,
  editSelectProperty,
} from '../../tests/shared/utilsGuiEditor';

/**
 * Regression test for https://github.com/MetaConfigurator/meta-configurator/issues/1031:
 * newly added elements of a oneOf array did not offer the "properties" and "required"
 * fields in the GUI view of the schema editor, while existing elements did.
 */
test('newly added oneOf subschema offers properties and required fields', async ({page}) => {
  await openApp(page, 'settings_testpanel.json', null, 'schema_minimal.schema.json');
  await forceEditorMode(page, SessionMode.SchemaEditor);

  // schema under edit: a property with a oneOf containing one existing object subschema
  await tpForceData(page, SessionMode.SchemaEditor, {
    type: 'object',
    properties: {
      pet: {
        oneOf: [{title: 'Dog', properties: {bark: {type: 'string'}}, required: ['bark']}],
      },
    },
  });

  // navigate the GUI view to the oneOf array
  await tpForceCurrentPath(page, SessionMode.SchemaEditor, ['properties', 'pet', 'oneOf']);

  // the existing element offers "properties" and "required" (after expanding it)
  await page.getByRole('cell', {name: /^Item 1 :/}).getByRole('button').first().click();
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 0, 'properties'], true);
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 0, 'required'], true);

  // add a new element to the oneOf array
  await addArrayItem(page, ['properties', 'pet', 'oneOf']);
  await expect
    .poll(async () => (await tpGetData(page, SessionMode.SchemaEditor)).properties.pet.oneOf.length)
    .toBe(2);

  // the new element must offer "properties" and "required" as well
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 1, 'properties'], true);
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 1, 'required'], true);
  // as long as it is empty it could become any type, so other type fields are offered too
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 1, 'items'], true);

  // choosing a non-object type hides the object specific fields again
  await editSelectProperty(page, ['properties', 'pet', 'oneOf', 1, 'type'], 'string');
  await expect
    .poll(
      async () => (await tpGetData(page, SessionMode.SchemaEditor)).properties.pet.oneOf[1].type
    )
    .toBe('string');
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 1, 'properties'], false);
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 1, 'required'], false);

  // and choosing the object type brings them back
  await editSelectProperty(page, ['properties', 'pet', 'oneOf', 1, 'type'], 'object');
  await expect
    .poll(
      async () => (await tpGetData(page, SessionMode.SchemaEditor)).properties.pet.oneOf[1].type
    )
    .toBe('object');
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 1, 'properties'], true);
  await checkPropertyExistence(page, ['properties', 'pet', 'oneOf', 1, 'required'], true);
});
