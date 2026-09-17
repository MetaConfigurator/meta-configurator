import {expect, test} from '@playwright/test';
import {
  openSelectionSchema,
  chooseSchemaOption,
  expandSchemaNode,
} from '../../tests/shared/utilsSchemaSelection';
import {tpGetData} from '../../tests/shared/utilsTestPanel';
import {SessionMode} from '../src/store/sessionMode';
import anyOfSchema from './test-fixtures/schema_nested_anyof.schema.json';

test('anyOf constants fill on first selection and update when the remaining selection changes', async ({
  page,
}) => {
  await openSelectionSchema(page, anyOfSchema);
  await chooseSchemaOption(page, 'configuration', 0, '0: ConfigurationOptionsSchema', 'anyOf');
  await chooseSchemaOption(page, 'configuration', 1, '0: OptionASchema', 'anyOf');
  await expect(page.getByTestId('property-data-configuration.kind').locator('input')).toHaveValue(
    'example.OptionA'
  );
  await expect
    .poll(() => tpGetData(page, SessionMode.DataEditor))
    .toEqual({configuration: {kind: 'example.OptionA'}});
  // Conflicting selections cannot both supply the constant: preserve data until resolved.
  await chooseSchemaOption(page, 'configuration', 1, '1: OptionBSchema', 'anyOf');
  await expect
    .poll(() => tpGetData(page, SessionMode.DataEditor))
    .toEqual({configuration: {kind: 'example.OptionA'}});
  await chooseSchemaOption(page, 'configuration', 1, '0: OptionASchema', 'anyOf');
  await expect(page.getByTestId('property-data-configuration.kind').locator('input')).toHaveValue(
    'example.OptionB'
  );
  await expect
    .poll(() => tpGetData(page, SessionMode.DataEditor))
    .toEqual({configuration: {kind: 'example.OptionB'}});
  await chooseSchemaOption(page, 'configuration', 1, '1: OptionBSchema', 'anyOf');
  await expect
    .poll(() => tpGetData(page, SessionMode.DataEditor))
    .toEqual({configuration: {kind: 'example.OptionB'}});
});

test('oneOf constants fill on first selection and update on switching', async ({page}) => {
  // Reuse the same fixture with the inner alternatives made exclusive.
  const schema = JSON.parse(JSON.stringify(anyOfSchema));
  const options = schema.properties.configuration.anyOf[0];
  options.oneOf = options.anyOf;
  delete options.anyOf;
  await openSelectionSchema(page, schema);
  await chooseSchemaOption(page, 'configuration', 0, '0: ConfigurationOptionsSchema', 'anyOf');
  for (const [index, name] of ['A', 'B', 'C'].entries()) {
    await chooseSchemaOption(page, 'configuration', 1, `${index}: Option${name}Schema`, 'oneOf');
    await expect(page.getByTestId('property-data-configuration.kind').locator('input')).toHaveValue(
      `example.Option${name}`
    );
    await expect
      .poll(() => tpGetData(page, SessionMode.DataEditor))
      .toEqual({configuration: {kind: `example.Option${name}`}});
  }
});

test('compatible anyOf selections fill all selected constants and preserve other data', async ({
  page,
}) => {
  await openSelectionSchema(
    page,
    {
      type: 'object',
      properties: {
        model: {
          anyOf: ['a', 'b'].map(name => ({
            title: name,
            type: 'object',
            properties: {[name]: {const: name}},
          })),
        },
      },
    },
    {model: {notes: 'keep'}}
  );
  await chooseSchemaOption(page, 'model', 0, '0: a', 'anyOf');
  await chooseSchemaOption(page, 'model', 0, '1: b', 'anyOf');
  await expect
    .poll(() => tpGetData(page, SessionMode.DataEditor))
    .toEqual({model: {a: 'a', b: 'b', notes: 'keep'}});
  await chooseSchemaOption(page, 'model', 0, '0: a', 'anyOf');
  await chooseSchemaOption(page, 'model', 0, '1: b', 'anyOf');
  await expect
    .poll(() => tpGetData(page, SessionMode.DataEditor))
    .toEqual({model: {a: 'a', b: 'b', notes: 'keep'}});
});

test('selecting an array item fills only that item and preserves nullable children', async ({
  page,
}) => {
  await openSelectionSchema(
    page,
    {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: {
            oneOf: ['A', 'B'].map(name => ({
              title: name,
              type: 'object',
              properties: {
                kind: {const: name},
                child: {type: ['object', 'null'], properties: {kind: {const: 'child'}}},
              },
              required: ['kind'],
            })),
          },
        },
      },
    },
    {models: [{child: null, notes: 'keep'}, {notes: 'other'}]}
  );
  await expandSchemaNode(page, 'models');
  for (const [index, name] of ['A', 'B'].entries()) {
    await chooseSchemaOption(page, 'models[0]', 0, `${index}: ${name}`, 'oneOf');
    await expect
      .poll(() => tpGetData(page, SessionMode.DataEditor))
      .toEqual({
        models: [{kind: name, child: null, notes: 'keep'}, {notes: 'other'}],
      });
  }
});

for (const model of [undefined, null, {notes: 'keep me', kind: 'old', nested: {enabled: true}}]) {
  test(`selection fills falsy and nested constants with initial model ${JSON.stringify(
    model
  )}`, async ({page}) => {
    await openSelectionSchema(
      page,
      {
        type: 'object',
        properties: {
          model: {
            oneOf: [
              {
                title: 'Constants',
                type: 'object',
                properties: {
                  kind: {const: ''},
                  count: {const: 0},
                  nothing: {const: null},
                  nested: {type: 'object', properties: {enabled: {const: false}}},
                  singleton: {enum: ['only']},
                  choice: {enum: ['a', 'b']},
                  optional: {type: 'object', properties: {text: {type: 'string'}}},
                },
                required: ['kind'],
              },
              {title: 'Other', type: 'string'},
            ],
          },
        },
      },
      model === undefined ? {} : {model}
    );
    await chooseSchemaOption(page, 'model', 0, '0: Constants', 'oneOf');
    await expect
      .poll(() => tpGetData(page, SessionMode.DataEditor))
      .toEqual({
        model: {
          ...(model ?? {}),
          kind: '',
          count: 0,
          nothing: null,
          nested: {enabled: false},
          singleton: 'only',
        },
      });
  });
}
