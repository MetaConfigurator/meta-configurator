import {test, expect} from '@playwright/test';
import {forceEditorMode, openApp, selectInitialSchemaFromExamples} from '../../tests/shared/utils';
import {tpForceCurrentPath} from '../../tests/shared/utilsTestPanel';
import {SessionMode} from '../src/store/sessionMode';

test('autonomous vehicle schema shows normal subschema option for properties entries', async ({
  page,
}) => {
  await openApp(page, 'settings_testpanel.json');
  await selectInitialSchemaFromExamples(page, 'Autonomous Vehicle Schema');
  await forceEditorMode(page, SessionMode.SchemaEditor);
  await tpForceCurrentPath(page, SessionMode.SchemaEditor, ['properties']);

  const simulationNameRow = page.getByTestId('property-data-properties.SimulationName');
  await expect(simulationNameRow).toBeVisible();

  const combo = simulationNameRow.getByRole('combobox');
  await combo.click();

  await expect(page.getByRole('option', {name: /0: Always valid/})).toBeVisible();
  await expect(page.getByRole('option', {name: /1: Always invalid/})).toBeVisible();
  await expect(page.getByRole('option', {name: /2: Subschema/})).toBeVisible();
});
