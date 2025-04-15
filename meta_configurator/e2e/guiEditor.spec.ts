import { test } from '@playwright/test';
import {
    checkCodeEditorForText,
    openApp, selectInitialSchemaFromExamples,
} from "./utils";
import {
    addArrayItem, checkPropertyRequired,
    checkPropertySchemaViolation,
    checkStringProperty, editBooleanProperty,
    editNumberOrIntProperty,
    editStringProperty, expandOrCollapseProperty
} from "./utilsGuiEditor";
import {SessionMode} from "../src/store/sessionMode";

test('Edit the feature testing example schema using the GUI Editor, testing basic editing and schema violations', async ({ page }) => {
    // Go to the app
    await openApp(page)

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

    // Expand 'address' property
    await expandOrCollapseProperty(page, ['address'])

    // Expand 'moreInfo' property
    await expandOrCollapseProperty(page, ['moreInfo'])

    // Expand 'booleanArray' property
    await expandOrCollapseProperty(page, ['booleanArray'])

    // Add new item to boolean array
    await addArrayItem(page, ['address', 'moreInfo', 'booleanArray'])

    // Check that code editor text reflects the changes
    await checkCodeEditorForText(page, '{ "name": "Alex", "heightInMeter": 10, "isMarried": true, "nickNames": [ "Al", "X"  ], "address": { "moreInfo": { "booleanArray": [ false ] } }}', SessionMode.DataEditor);
});