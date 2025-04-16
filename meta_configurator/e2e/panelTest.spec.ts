import { test, expect} from '@playwright/test';
import {
    forceEditorMode,
    openApp,
} from "./utils";
import {SessionMode} from "../src/store/sessionMode";
import {
    tpForceCurrentPath,
    tpForceCurrentSelectedElement, tpForceData, tpForceSchema,
    tpGetCurrentPath,
    tpGetCurrentSelectedElement, tpGetData, tpGetSchema
} from "./utilsTestPanel";

test('Test whether the path selection and detection in the test panel work as expected.', async ({ page }) => {
    // Go to the app, pre-loading the schema
    await openApp(page, 'settings_testpanel.json', null, 'schema_medium.schema.json')

    // Go to the schema editor mode
    await forceEditorMode(page, SessionMode.SchemaEditor)

    // Select the path ["properties", "address", "city"] in the schema editor as currentSelectedElement
    const pathAddressCity = ["properties", "address", "city"];
    await tpForceCurrentSelectedElement(page, SessionMode.SchemaEditor, pathAddressCity);
    // Check whether the currentSelectedElement is set correctly
    const selectedElement = await tpGetCurrentSelectedElement(page, SessionMode.SchemaEditor)
    expect(selectedElement).toEqual(pathAddressCity);

    // Select the path ["properties"] as currentPath
    const pathProps = ["properties"];
    await tpForceCurrentPath(page, SessionMode.SchemaEditor, pathProps);
    // Check whether the currentPath is set correctly
    const currentPath = await tpGetCurrentPath(page, SessionMode.SchemaEditor)
    expect(currentPath).toEqual(pathProps);

    // Set the currentPath back to the root element
    const path_root = [];
    await tpForceCurrentPath(page, SessionMode.SchemaEditor, path_root);
    // Check whether the currentPath is set correctly
    const currentPath2 = await tpGetCurrentPath(page, SessionMode.SchemaEditor, false)
    expect(currentPath2).toEqual(path_root);

});

test('Test whether changing and reading the data in the test panel works as expected.', async ({ page }) => {
    // Go to the app, pre-loading the schema
    await openApp(page, 'settings_testpanel.json', null, 'schema_medium.schema.json')

    // Go to the schema editor mode
    await forceEditorMode(page, SessionMode.DataEditor)

    //Expect that currently the data is an empty dict
    const dataInitial = await tpGetData(page, SessionMode.DataEditor);
    expect(dataInitial).toEqual({});

    // Set the data to {"properties": {"address": {"city": "Berlin"}}}
    const dataBerlin = {"properties": {"address": {"city": "Berlin"}}};
    await tpForceData(page, SessionMode.DataEditor, dataBerlin);
    // Check whether the data is set correctly
    const dataAfterBerlinChange = await tpGetData(page, SessionMode.DataEditor);
    expect(dataAfterBerlinChange).toEqual(dataBerlin);

});

test('Test whether changing and reading the schema in the test panel works as expected.', async ({ page }) => {
    // Go to the app, pre-loading the schema
    await openApp(page, 'settings_testpanel.json', null, 'schema_medium.schema.json')

    // Go to the schema editor mode
    await forceEditorMode(page, SessionMode.SchemaEditor)

    //Expect that currently the schema is the pre-loaded schema
    const schemaInitial = await tpGetSchema(page, SessionMode.DataEditor);
    expect(schemaInitial).toEqual(
        {"properties": {"address": {"properties": {"city": {"type": "string"}, "state": {"type": "string"}, "street": {"type": "string"}, "zip": {"type": "string"}}, "required": ["street", "city", "state", "zip"], "type": "object"}, "age": {"minimum": 0, "type": "number"}, "name": {"type": "string"}}, "title": "Person", "type": "object"}
    )

    // Set the schema to a simpler schema with only the address property, which in turn only has a city and not more other properties
    const schemaAddress = {"properties": {"address": {"properties": {"city": {"type": "string"}}, "required": ["city"], "type": "object"}}, "title": "Person", "type": "object"};
    await tpForceSchema(page, SessionMode.DataEditor, schemaAddress);
    // Check whether the schema is set correctly
    const schemaAfterAddressChange = await tpGetSchema(page, SessionMode.DataEditor);
    expect(schemaAfterAddressChange).toEqual(schemaAddress);

});