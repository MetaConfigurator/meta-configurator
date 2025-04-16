import {Page} from "playwright";
import {expect} from "@playwright/test";
import {Path, PathElement} from "../src/utility/path";
import {pathToString} from "../src/utility/pathUtils";


export async function checkPropertyExistence(page: Page, propertyPath: Path, shouldBeVisible: boolean) {
    const pathAsString = pathToString(propertyPath);
    const property = page.getByTestId(`property-data-${pathAsString}`);
    if (shouldBeVisible) {
        await expect(property).toBeVisible();
    } else {
        await expect(property).not.toBeVisible();
    }
}

export async function editStringProperty(page: Page, propertyPath: Path, value: string) {
    const pathAsString = pathToString(propertyPath);
    const textField = page.getByTestId(`property-data-${pathAsString}`).getByRole('textbox')
    await textField.click();
    await textField.fill(value);
    await textField.press('Enter');
}

export async function checkStringProperty(page: Page, propertyPath: Path, value: string) {
    const pathAsString = pathToString(propertyPath);
    const textField = page.getByTestId(`property-data-${pathAsString}`).getByRole('textbox')
    await expect(textField).toHaveValue(value);
}

export async function editBooleanProperty(page: Page, propertyPath: Path, value: boolean) {
    const pathAsString = pathToString(propertyPath);
    // the component has two buttons, one with the name "false" and one with the name "true". The corresponding button must be clicked
    const button = page.getByTestId(`property-data-${pathAsString}`).getByRole('button', { name: value.toString() });
    await button.click();
}

export async function editNumberOrIntProperty(page: Page, propertyPath: Path, value: number) {
    const pathAsString = pathToString(propertyPath);
    const spinButton = page.getByTestId(`property-data-${pathAsString}`).getByRole('spinbutton')
    await spinButton.click();
    await spinButton.press('Control+A'); // or 'Meta+A' on macOS
    await spinButton.press('Backspace');

    // Simulate real typing
    for (const char of value.toString()) {
        await page.keyboard.press(char);
    }

    await spinButton.press('Enter');
}

export async function checkNumberOrIntProperty(page: Page, propertyPath: Path, value: number) {
    const pathAsString = pathToString(propertyPath);
    const textField = page.getByTestId(`property-data-${pathAsString}`).getByRole('spinbutton')
    await expect(textField).toHaveValue(value.toString());
}

export async function removeOptionalPropertyValue(page: Page, propertyPath: Path) {
    const pathAsString = pathToString(propertyPath);
    const removeButton = page.getByTestId(`property-data-${pathAsString}`).getByRole('button', { name: 'Remove' });
    await removeButton.click();
}

export async function addObjectProperty(page: Page, propertyPath: Path) {
    const pathAsString = pathToString(propertyPath);
    const addButton = page.getByTestId(`add-property-${pathAsString}`);
    await addButton.click();
}

export async function addArrayItem(page: Page, propertyPath: Path) {
    const pathAsString = pathToString(propertyPath);
    const addButton = page.getByTestId(`add-item-${pathAsString}`);
    await addButton.click();
}

export async function checkPropertySchemaViolation(page: Page, propertyPath: Path, shouldBeVisible: boolean) {
    const pathAsString = pathToString(propertyPath);
    const validationErrorIcon = page.getByTestId(`property-metadata-${pathAsString}`).getByTestId("validation-error-icon");
    if (shouldBeVisible) {
        await expect(validationErrorIcon).toBeVisible();
    } else {
        await expect(validationErrorIcon).not.toBeVisible();
    }
}

export async function checkPropertyRequired(page: Page, propertyPath: Path, shouldBeVisible: boolean) {
    const pathAsString = pathToString(propertyPath);
    const requiredIcon = page.getByTestId(`property-metadata-${pathAsString}`).getByTestId("required-star");
    if (shouldBeVisible) {
        await expect(requiredIcon).toBeVisible();
    } else {
        await expect(requiredIcon).not.toBeVisible();
    }
}

export async function expandOrCollapseProperty(page: Page, propertyPathElement: PathElement) {
    // property name is last element of path. Full path is not available at the expansion button
    // example call for proeprty 'circular': await page.getByRole('cell', { name: 'circular : object 2 properties' }).getByRole('button').click();
    // do check if the name starts with the propertyName, but ignore the other part of the name, as it can differ always depending on the children count
    const expansionButton = page.getByRole('cell', { name: new RegExp(`^${propertyPathElement} :`) }).getByRole('button');
    await expansionButton.click();
}