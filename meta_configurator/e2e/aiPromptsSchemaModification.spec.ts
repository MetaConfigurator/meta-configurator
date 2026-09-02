import {test, expect} from '@playwright/test';
import {forceEditorMode, openApp} from '../../tests/shared/utils';
import {SessionMode} from '../src/store/sessionMode';
import {tpForceCurrentSelectedElement, tpGetData} from '../../tests/shared/utilsTestPanel';
import {aiPanelEnterModifyPrompt, aiPanelSubmitModify} from '../../tests/shared/utilsAiPanel';

test('AI schema modification bundles referenced definitions and updates them in place.', async ({
  page,
}) => {
  // what the mock AI returns: the bundled ConservationStatus definition with the enum value "Very Endangered" added
  const modifiedSubSchema = {
    $ref: '#/$defs/ConservationStatus',
    $defs: {
      ConservationStatus: {
        type: 'string',
        enum: [
          'Least Concern',
          'Near Threatened',
          'Vulnerable',
          'Endangered',
          'Very Endangered',
          'Critically Endangered',
          'Extinct in the Wild',
          'Extinct',
          'Data Deficient',
          'Not Evaluated',
        ],
      },
    },
  };

  // mock the AI endpoint, no matter which backend is configured
  await page.route('**/chat/completions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({choices: [{message: {content: JSON.stringify(modifiedSubSchema)}}]}),
    });
  });

  // Go to the app, pre-loading the Animal schema, and go to the schema editor mode
  await openApp(page, 'settings_aipanel.json', null, 'schema_animal.schema.json');
  await forceEditorMode(page, SessionMode.SchemaEditor);

  // Select the sub-schema /properties/conservationStatus, which references #/$defs/ConservationStatus
  await tpForceCurrentSelectedElement(page, SessionMode.SchemaEditor, [
    'properties',
    'conservationStatus',
  ]);

  // Submit the modification prompt
  await aiPanelEnterModifyPrompt(
    page,
    'add more types to the conservation status: add also "Very Endangered"'
  );
  const aiRequestPromise = page.waitForRequest('**/chat/completions');
  await aiPanelSubmitModify(page);

  // The request to the AI must contain the referenced ConservationStatus definition bundled into the sub-schema...
  const aiRequest = await aiRequestPromise;
  const systemMessage: string = aiRequest.postDataJSON().messages[0].content;
  expect(systemMessage).toContain('"$defs"');
  expect(systemMessage).toContain('"ConservationStatus"');
  expect(systemMessage).toContain('Least Concern');
  // ...but not definitions which the sub-schema does not reference
  expect(systemMessage).not.toContain('"Habitat"');

  // The modified definition must be written back to the root $defs in place
  await expect
    .poll(async () => {
      const schemaDocument = await tpGetData(page, SessionMode.SchemaEditor);
      return schemaDocument.$defs.ConservationStatus.enum;
    })
    .toContain('Very Endangered');

  const schemaDocument = await tpGetData(page, SessionMode.SchemaEditor);
  // no renamed copy of the definition may be created
  expect(schemaDocument.$defs.ConservationStatus2).toBeUndefined();
  // the selected sub-schema must still reference the definition and not keep the bundled $defs
  expect(schemaDocument.properties.conservationStatus).toEqual({
    $ref: '#/$defs/ConservationStatus',
  });
});
