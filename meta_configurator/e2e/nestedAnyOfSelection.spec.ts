import {expect, test} from '@playwright/test';
import {openApp} from '../../tests/shared/utils';
import {chooseSchemaOption} from '../../tests/shared/utilsSchemaSelection';

// Nullable outer anyOf with three nested object alternatives.
const configurationField = 'property-data-configuration';

test('nested anyOf selections at the same data path remain independently selectable', async ({
  page,
}) => {
  await openApp(page, 'settings_testpanel.json', null, 'schema_nested_anyof.schema.json');

  await chooseSchemaOption(page, 'configuration', 0, '0: ConfigurationOptionsSchema', 'anyOf');
  await expect(page.getByTestId(configurationField).locator('.p-multiselect')).toHaveCount(2);

  // This is index 1 in the nested anyOf, but index 1 means null in the outer anyOf.
  // Previously it overwrote the outer selection and made the nested field disappear.
  await chooseSchemaOption(page, 'configuration', 1, '1: OptionBSchema', 'anyOf');
  await expect(page.getByTestId(configurationField).locator('.p-multiselect')).toHaveCount(2);
  await expect(page.getByTestId('property-data-configuration.kind')).toBeVisible();

  // Deselecting the nested option must leave the outer configuration branch selected.
  await chooseSchemaOption(page, 'configuration', 1, '1: OptionBSchema', 'anyOf');
  await expect(page.getByTestId(configurationField).locator('.p-multiselect')).toHaveCount(2);
  await expect(page.getByTestId('property-data-configuration.kind')).not.toBeVisible();

  // Index 2 does not exist in the outer anyOf. Previously selecting this option caused
  // "could not find option with index 2" and collapsed the selected branch.
  await chooseSchemaOption(page, 'configuration', 1, '2: OptionCSchema', 'anyOf');
  await expect(page.getByTestId(configurationField).locator('.p-multiselect')).toHaveCount(2);
  await expect(page.getByTestId('property-data-configuration.values')).toBeVisible();
});
