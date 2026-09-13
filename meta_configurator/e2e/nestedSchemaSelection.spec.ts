import {expect, test} from '@playwright/test';
import {
  compositionKinds,
  nestedSelectionSchema,
  selectionField,
  selectionSchema,
} from '../../tests/shared/schemaSelectionFixtures';
import {
  chooseSchemaOption,
  expandSchemaNode,
  openSelectionSchema,
  schemaSelectors,
} from '../../tests/shared/utilsSchemaSelection';
import {checkStringProperty, editStringProperty} from '../../tests/shared/utilsGuiEditor';
import {tpGetCurrentPath, tpGetData} from '../../tests/shared/utilsTestPanel';
import {SessionMode} from '../src/store/sessionMode';

for (const outer of compositionKinds) {
  for (const inner of compositionKinds) {
    test(`${outer} → ${inner}: edit, switch inner option, leave and restore the outer branch`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await openSelectionSchema(page, nestedSelectionSchema(outer, inner));

      await test.step('select a nested index which means null in the parent', async () => {
        await chooseSchemaOption(page, 'model', 0, '0: Models', outer);
        await expect(schemaSelectors(page, 'model')).toHaveCount(2);
        await chooseSchemaOption(page, 'model', 1, '1: b', inner);
        await expect(schemaSelectors(page, 'model').first()).toContainText('Models');
        await expect(page.getByTestId('property-data-model.b')).toBeVisible();
      });

      await test.step('write data through the nested branch at the correct data path', async () => {
        await editStringProperty(page, ['model', 'b'], 'nested value');
        await expect
          .poll(() => tpGetData(page, SessionMode.DataEditor))
          .toEqual({model: {b: 'nested value'}});
      });

      await test.step('select an index which does not exist in the parent', async () => {
        if (inner === 'anyOf') {
          await chooseSchemaOption(page, 'model', 1, '1: b', inner);
          await expect(schemaSelectors(page, 'model').nth(1)).toContainText('Select sub-schemas');
          await expect(schemaSelectors(page, 'model').first()).toContainText('Models');
        }
        await chooseSchemaOption(page, 'model', 1, '2: c', inner);
        await expect(page.getByTestId('property-data-model.c')).toBeVisible();
        await expect(schemaSelectors(page, 'model').last()).toContainText('c');
      });

      await test.step('leave the parent branch and restore its previous nested choice', async () => {
        if (outer === 'anyOf') await chooseSchemaOption(page, 'model', 0, '0: Models', outer);
        await chooseSchemaOption(page, 'model', 0, '1: Disabled', outer);
        await expect(schemaSelectors(page, 'model')).toHaveCount(1);
        if (outer === 'anyOf') await chooseSchemaOption(page, 'model', 0, '1: Disabled', outer);
        await chooseSchemaOption(page, 'model', 0, '0: Models', outer);
        await expect(schemaSelectors(page, 'model')).toHaveCount(2);
        await expect(schemaSelectors(page, 'model').last()).toContainText('c');
        await expect(page.getByTestId('property-data-model.c')).toBeVisible();
        expect(await tpGetData(page, SessionMode.DataEditor)).toEqual({model: {b: 'nested value'}});
      });
      expect(errors).toEqual([]);
    });
  }
}

for (const kind of compositionKinds) {
  test(`${kind}: zoom into a nested selection, edit, and return to the document root`, async ({
    page,
  }) => {
    await openSelectionSchema(page, nestedSelectionSchema(kind, kind));
    await chooseSchemaOption(page, 'model', 0, '0: Models', kind);
    await chooseSchemaOption(page, 'model', 1, '1: b', kind);
    await editStringProperty(page, ['model', 'b'], 'before zoom');
    await page.locator('[id="_label_model"]').first().click();
    await expect.poll(() => tpGetCurrentPath(page, SessionMode.DataEditor)).toEqual(['model']);
    await checkStringProperty(page, ['model', 'b'], 'before zoom');
    await expect(page.getByTestId('property-data-model.a')).not.toBeVisible();
    await editStringProperty(page, ['model', 'b'], 'after zoom');
    await page
      .getByRole('navigation', {name: 'Breadcrumb'})
      .getByText('document root', {exact: true})
      .click();
    await expect.poll(() => tpGetCurrentPath(page, SessionMode.DataEditor, false)).toEqual([]);
    await expect(schemaSelectors(page, 'model').last()).toContainText('b');
    await checkStringProperty(page, ['model', 'b'], 'after zoom');
    expect(await tpGetData(page, SessionMode.DataEditor)).toEqual({model: {b: 'after zoom'}});
  });
}

test('switching outer branches does not select an unrelated option in a shared child property', async ({
  page,
}) => {
  await openSelectionSchema(page, {
    type: 'object',
    properties: {
      model: selectionSchema('oneOf', [
        {title: 'First', type: 'object', properties: {config: selectionSchema('anyOf')}},
        {
          title: 'Second',
          type: 'object',
          properties: {config: selectionSchema('anyOf', ['x', 'y'].map(selectionField))},
        },
      ]),
    },
  });
  await chooseSchemaOption(page, 'model', 0, '0: First', 'oneOf');
  await chooseSchemaOption(page, 'model.config', 0, '2: c', 'anyOf');
  await expect(page.getByTestId('property-data-model.config.c')).toBeVisible();
  await chooseSchemaOption(page, 'model', 0, '1: Second', 'oneOf');
  await expect(schemaSelectors(page, 'model.config').first()).toContainText('Select sub-schemas');
  await chooseSchemaOption(page, 'model.config', 0, '1: y', 'anyOf');
  await expect(page.getByTestId('property-data-model.config.y')).toBeVisible();
  await chooseSchemaOption(page, 'model', 0, '0: First', 'oneOf');
  await expect(schemaSelectors(page, 'model.config').first()).toContainText('c');
  await expect(page.getByTestId('property-data-model.config.c')).toBeVisible();
});

test('two array items keep separate nested selections and write to their own indices', async ({
  page,
}) => {
  const nested = selectionSchema('anyOf', [
    {title: 'Models', ...(selectionSchema('anyOf') as object)},
    {title: 'Disabled', type: 'null'},
  ]);
  await openSelectionSchema(
    page,
    {type: 'object', properties: {models: {type: 'array', items: nested}}},
    {models: [{}, {}]}
  );
  await expandSchemaNode(page, 'models');
  await chooseSchemaOption(page, 'models[0]', 0, '0: Models', 'anyOf');
  await chooseSchemaOption(page, 'models[0]', 1, '1: b', 'anyOf');
  await expect(schemaSelectors(page, 'models[1]')).toHaveCount(1);
  await chooseSchemaOption(page, 'models[1]', 0, '0: Models', 'anyOf');
  await chooseSchemaOption(page, 'models[1]', 1, '2: c', 'anyOf');
  await editStringProperty(page, ['models', 0, 'b'], 'first');
  await editStringProperty(page, ['models', 1, 'c'], 'second');
  await expect
    .poll(() => tpGetData(page, SessionMode.DataEditor))
    .toEqual({models: [{b: 'first'}, {c: 'second'}]});
  await expect(schemaSelectors(page, 'models[0]').last()).toContainText('b');
  await expect(schemaSelectors(page, 'models[1]').last()).toContainText('c');
});

test('nested oneOf infers the selected branch from existing data without overwriting its parent', async ({
  page,
}) => {
  await openSelectionSchema(page, nestedSelectionSchema('oneOf', 'oneOf'), {model: {c: 'loaded'}});
  await expect(schemaSelectors(page, 'model').first()).toContainText('Models');
  await expandSchemaNode(page, 'model');
  await expect(schemaSelectors(page, 'model')).toHaveCount(2);
  await expect(schemaSelectors(page, 'model').last()).toContainText('c');
  await checkStringProperty(page, ['model', 'c'], 'loaded');
  await editStringProperty(page, ['model', 'c'], 'edited');
  await expect.poll(() => tpGetData(page, SessionMode.DataEditor)).toEqual({model: {c: 'edited'}});
});

test('multiple compatible nested anyOf options can be selected and cleared independently', async ({
  page,
}) => {
  await openSelectionSchema(page, {
    type: 'object',
    properties: {
      model: selectionSchema('anyOf', [
        {
          title: 'Models',
          anyOf: ['a', 'b', 'c'].map(name => ({
            title: name,
            type: 'object',
            properties: {[name]: {type: 'string'}},
          })),
        },
        {title: 'Disabled', type: 'null'},
      ]),
    },
  });
  await chooseSchemaOption(page, 'model', 0, '0: Models', 'anyOf');
  await chooseSchemaOption(page, 'model', 1, '0: a', 'anyOf');
  await chooseSchemaOption(page, 'model', 1, '2: c', 'anyOf');
  await expect(page.getByTestId('property-data-model.a')).toBeVisible();
  await expect(page.getByTestId('property-data-model.c')).toBeVisible();
  await chooseSchemaOption(page, 'model', 1, '0: a', 'anyOf');
  await expect(page.getByTestId('property-data-model.a')).not.toBeVisible();
  await expect(page.getByTestId('property-data-model.c')).toBeVisible();
  await chooseSchemaOption(page, 'model', 1, '2: c', 'anyOf');
  await expect(page.getByTestId('property-data-model.c')).not.toBeVisible();
  await expect(schemaSelectors(page, 'model').nth(1)).toContainText('Select sub-schemas');
  await expect(schemaSelectors(page, 'model').first()).toContainText('Models');
});
