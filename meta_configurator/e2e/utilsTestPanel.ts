import {Page} from "playwright";
import {expect} from "@playwright/test";
import {Path} from "../src/utility/path";
import {jsonPointerToPathTyped, pathToJsonPointer} from "../src/utility/pathUtils";
import {SessionMode} from "../src/store/sessionMode";


export async function tpGetCurrentSelectedElement(page: Page, mode: SessionMode, expectNonRootPath: boolean = true): Promise<Path> {
    const testComponent = await getTestComponentForMode(page, mode);
    const currentSelectedElement = testComponent.getByTestId('current-selected-element');

    if (expectNonRootPath) {
        await expect(currentSelectedElement).toBeVisible();
        const pathJsonPointer = await currentSelectedElement.textContent();
        if (pathJsonPointer === null) {
            return []
        } else {
            return jsonPointerToPathTyped(pathJsonPointer)
        }
    } else {
        await expect(currentSelectedElement).not.toBeVisible();
        return []
    }
}

export async function tpGetCurrentPath(page: Page, mode: SessionMode, expectNonRootPath: boolean = true): Promise<Path> {
    const testComponent = await getTestComponentForMode(page, mode);
    const currentPath = testComponent.getByTestId('current-path');
    if (expectNonRootPath) {
        await expect(currentPath).toBeVisible();
        const pathJsonPointer = await currentPath.textContent();
        if (pathJsonPointer === null) {
            return []
        } else {
            return jsonPointerToPathTyped(pathJsonPointer)
        }
    } else {
        await expect(currentPath).not.toBeVisible();
        return []
    }
}

export async function tpGetData(page: Page, mode: SessionMode): Promise<any> {
    const testComponent = await getTestComponentForMode(page, mode);
    const currentData = testComponent.getByTestId('data');
    await expect(currentData).toBeVisible();
    const data = await currentData.textContent();
    if (data === null) {
        throw []
    } else {
        return JSON.parse(data)
    }
}

export async function tpGetSchema(page: Page, mode: SessionMode): Promise<any> {
    const testComponent = await getTestComponentForMode(page, mode);
    const currentSchema = testComponent.getByTestId('schema');
    await expect(currentSchema).toBeVisible();
    const schema = await currentSchema.textContent();
    if (schema === null) {
        throw []
    } else {
        return JSON.parse(schema)
    }
}

export async function tpForceCurrentPath(page: Page, mode: SessionMode, path: Path) {
    const testComponent = await getTestComponentForMode(page, mode);
    const currentPathInput = testComponent.getByTestId('current-path-input');
    await expect(currentPathInput).toBeVisible();
    const pathAsJsonPointer = pathToJsonPointer(path);
    await currentPathInput.fill(pathAsJsonPointer);
    await currentPathInput.dispatchEvent('change');
    const submitCurrentPath = testComponent.getByTestId('submit-current-path');
    await expect(submitCurrentPath).toBeVisible();
    await submitCurrentPath.click();
}

export async function tpForceCurrentSelectedElement(page: Page, mode: SessionMode, path: Path) {
    const testComponent = await getTestComponentForMode(page, mode);
    const currentSelectedElementInput = testComponent.getByTestId('current-selected-element-input');
    await expect(currentSelectedElementInput).toBeVisible();
    const pathAsJsonPointer = pathToJsonPointer(path);
    await currentSelectedElementInput.fill(pathAsJsonPointer);
    await currentSelectedElementInput.dispatchEvent('change');
    const submitCurrentSelectedElement = testComponent.getByTestId('submit-current-selected-element');
    await expect(submitCurrentSelectedElement).toBeVisible();
    await submitCurrentSelectedElement.click();
}

export async function tpForceData(page: Page, mode: SessionMode, data: any) {
    const testComponent = await getTestComponentForMode(page, mode);
    const dataInput = testComponent.getByTestId('data-input');
    await expect(dataInput).toBeVisible();
    const dataAsString = JSON.stringify(data);
    await dataInput.fill(dataAsString);
    await dataInput.dispatchEvent('change');
    const submitData = testComponent.getByTestId('submit-data');
    await expect(submitData).toBeVisible();
    await submitData.click();
}

export async function tpForceSchema(page: Page, mode: SessionMode, schema: any) {
    const testComponent = await getTestComponentForMode(page, mode);
    const schemaInput = testComponent.getByTestId('schema-input');
    await expect(schemaInput).toBeVisible();
    const schemaAsString = JSON.stringify(schema);
    await schemaInput.fill(schemaAsString);
    await schemaInput.dispatchEvent('change');
    const submitSchema = testComponent.getByTestId('submit-schema');
    await expect(submitSchema).toBeVisible();
    await submitSchema.click();
}

async function getTestComponentForMode(page: Page, mode: SessionMode) {
    const testComponent = page.getByTestId(`test-component-${mode}`)
    await expect(testComponent).toBeVisible();
    return testComponent;
}
