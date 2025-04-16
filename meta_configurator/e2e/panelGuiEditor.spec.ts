import { test, expect } from '@playwright/test';
import {
    forceEditorMode,
    openApp, selectInitialSchemaFromExamples,
} from "./utils";
import {
    addArrayItem, checkPropertyExistence, checkPropertyRequired,
    checkPropertySchemaViolation,
    checkStringProperty, editBooleanProperty,
    editNumberOrIntProperty,
    editStringProperty, expandOrCollapseProperty
} from "./utilsGuiEditor";
import {SessionMode} from "../src/store/sessionMode";
import {tpForceCurrentSelectedElement, tpForceData, tpGetData} from "./utilsTestPanel";

test('Edit the feature testing example schema using the GUI Editor, testing basic editing and schema violations', async ({ page }) => {
    // Go to the app, pre-loading the test settings
    await openApp(page, 'settings_testpanel.json', null, null)

    // Select the "Feature Testing Schema" from the example schema options
    await selectInitialSchemaFromExamples(page, 'Feature Testing Schema');

    // Make sure that the name property is marked as required and telephoneNumber is not
    await checkPropertyRequired(page, ['name'], true)
    await checkPropertyRequired(page, ['telephoneNumber'], false)

    // Set the name property to the value 'Alex'
    await editStringProperty(page, ['name'], 'Alex')

    // Check the name property value
    await checkStringProperty(page, ['name'], 'Alex')

    // Set the heightInMeter property to the value 10
    await editNumberOrIntProperty(page, ['heightInMeter'], 10)

    // Expect a Schema Violation Symbol because the height value is invalid
    await checkPropertySchemaViolation(page, ['heightInMeter'], true)

    // Set isMarried to true
    await editBooleanProperty(page, ['isMarried'], true)

    // Add a new nickNames array item
    await addArrayItem(page, ['nickNames'])

    // Edit the first nickNames array item to 'Al'
    await editStringProperty(page, ['nickNames', 0], 'Al')

    // Add a second nickNames array item
    await addArrayItem(page, ['nickNames'])

    // Edit the second nickNames array item to 'X'
    await editStringProperty(page, ['nickNames', 1], 'X')

    // Expect the moreInfo property is not visible
    await checkPropertyExistence(page, ['address', 'moreInfo'], false)
    // Expand 'address' property
    await expandOrCollapseProperty(page, 'address')
    // Check that the moreInfo property is now visible
    await checkPropertyExistence(page, ['address', 'moreInfo'], true)

    // Expect the booleanArray property is not visible
    await checkPropertyExistence(page, ['address', 'moreInfo', 'booleanArray'], false)
    // Expand 'moreInfo' property
    await expandOrCollapseProperty(page, 'moreInfo')
    // Check that the booleanArray property is now visible
    await checkPropertyExistence(page, ['address', 'moreInfo', 'booleanArray'], true)

    // Expand 'booleanArray' property
    await expandOrCollapseProperty(page, 'booleanArray')

    // Add new item to boolean array
    await addArrayItem(page, ['address', 'moreInfo', 'booleanArray'])

    // Check that code editor text reflects the changes
    const data = await tpGetData(page, SessionMode.DataEditor);
    expect(data).toEqual({
        name: 'Alex',
        heightInMeter: 10,
        isMarried: true,
        nickNames: ['Al', 'X'],
        address: {
            moreInfo: {
                booleanArray: [false ]
            }
        }
    });
});

test('Test whether selecting an element, of which the parent is collapsed in the GUI editor expands it', async ({ page }) => {
    // Go to the app, pre-loading the schema
    await openApp(page, 'settings_testpanel.json', null, 'schema_medium.schema.json')

    // Change to the schema editor
    await forceEditorMode(page, SessionMode.SchemaEditor)

    const elementOfInterest = ['properties', 'address', 'properties', 'city']
    // Make sure the elementOfInterest is currently not visible
    await checkPropertyExistence(page, elementOfInterest, false)

    // Select the elementOfInterest in the schema editor as currentSelectedElement
    await tpForceCurrentSelectedElement(page, SessionMode.SchemaEditor, elementOfInterest);
    // Expect that the elementOfInterest is now visible
    await checkPropertyExistence(page, elementOfInterest, true)
});



test('Change the internal data and check if the GUI editor is updated properly', async ({ page }) => {
    // Go to the app, pre-loading the schema
    await openApp(page, 'settings_testpanel.json', null, 'schema_medium.schema.json')

    // Expand the address property
    await expandOrCollapseProperty(page, 'address')

    // Confirm that the initial name and city both are empty strings
    await checkStringProperty(page, ['name'], '')
    await checkStringProperty(page, ['address', 'city'], '')

    // Update the data to {"properties": {"address": {"city": "Berlin"}}}
    const dataBerlin = {"address": {"city": "Berlin"}};
    await tpForceData(page, SessionMode.DataEditor, dataBerlin);
    // Validate that the name is still empty but the city now has the value Berlin
    await checkStringProperty(page, ['name'], '')
    await checkStringProperty(page, ['address', 'city'], 'Berlin')
});

test('Change the GUI editor content and check if the internal data is updated properly', async ({ page }) => {
    // Go to the app, pre-loading the schema
    await openApp(page, 'settings_testpanel.json', null, 'schema_medium.schema.json')

    // Expand the address property
    await expandOrCollapseProperty(page, 'address')

    // Confirm that the initial internal data is an empty object
    const dataInitial = await tpGetData(page, SessionMode.DataEditor);
    expect(dataInitial).toEqual({});

    // Change the GUI editor content
    await editStringProperty(page, ['name'], 'Alex')
    await editStringProperty(page, ['address', 'city'], 'Berlin')

    // Validate that the internal data is updated correctly
    const dataAfterNameEnter = await tpGetData(page, SessionMode.DataEditor);
    expect(dataAfterNameEnter).toEqual({ name: 'Alex', address: { city: 'Berlin' } });
});