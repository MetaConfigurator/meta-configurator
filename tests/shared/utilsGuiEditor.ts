import {expect, type Page} from "./playwright";
import type { Locator } from "./playwright";
import {Path, PathElement} from "../../meta_configurator/src/utility/path";
import {pathToString} from "../../meta_configurator/src/utility/pathUtils";


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
    const textField = page.getByTestId(`property-data-${pathAsString}`).getByRole('textbox')
    await textField.click();
    await textField.fill(value.toString());
    await textField.blur();
}

export async function checkNumberOrIntProperty(page: Page, propertyPath: Path, value: number) {
    const pathAsString = pathToString(propertyPath);
    const textField = page.getByTestId(`property-data-${pathAsString}`).getByRole('textbox')
    await expect(textField).toHaveValue(value.toString());
}

export async function editSelectProperty(page: Page, propertyPath: Path, value: string) {
    // properties rendered as an editable select (e.g. the "type" field in the schema editor)
    // accept typed input in their combobox
    const pathAsString = pathToString(propertyPath);
    const comboInput = page.getByTestId(`property-data-${pathAsString}`).getByRole('combobox').first();
    await comboInput.click();
    await comboInput.fill(value);
    await comboInput.press('Enter');
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

/**
 * Reorders an array item by dragging it onto another item's row, dropping above ('before') or
 * below ('after') that row depending on `position`. Dispatches HTML5 drag events with a shared
 * DataTransfer, since Playwright's synthetic mouse movements do not trigger native drag-and-drop.
 */
export async function reorderArrayItemByDragAndDrop(page: Page, fromPath: Path, toPath: Path, position: 'before' | 'after' = 'before') {
    const source = page.getByTestId(`property-metadata-${pathToString(fromPath)}`);
    const target = page.getByTestId(`property-metadata-${pathToString(toPath)}`);
    const box = (await target.boundingBox())!;
    const clientX = box.x + box.width / 2;
    const clientY = box.y + box.height * (position === 'after' ? 0.75 : 0.25);
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await source.dispatchEvent('dragstart', { dataTransfer });
    await target.dispatchEvent('dragover', { dataTransfer, clientX, clientY });
    await target.dispatchEvent('drop', { dataTransfer, clientX, clientY });
    await source.dispatchEvent('dragend', { dataTransfer });
}

/**
 * Reorders an array item via the keyboard: focuses the item's field and presses Alt+ArrowUp /
 * Alt+ArrowDown (Option+Arrow on Mac) to move it by one slot.
 */
export async function reorderArrayItemByKeyboard(page: Page, itemPath: Path, direction: 'up' | 'down') {
    const field = page.getByTestId(`property-data-${pathToString(itemPath)}`).getByRole('textbox');
    await field.click();
    await field.press(direction === 'up' ? 'Alt+ArrowUp' : 'Alt+ArrowDown');
}

export async function checkPropertySchemaViolation(page: Page, propertyPath: Path, shouldBeVisible: boolean) {
    const pathAsString = pathToString(propertyPath);
    const propertyMetadata = page.getByTestId(`property-metadata-${pathAsString}`);
    const validationErrorIcon = propertyMetadata.getByTestId("validation-error-icon");
    if (shouldBeVisible) {
        await expect(propertyMetadata).toBeVisible();
        await expect(validationErrorIcon).toBeVisible({timeout: 8000});
    } else {
        await expect(validationErrorIcon).not.toBeVisible();
    }
}

export async function checkPropertyRequired(page: Page, propertyPath: Path, shouldBeVisible: boolean) {
    const pathAsString = pathToString(propertyPath);
    const requiredIcon = page.getByTestId(`property-metadata-${pathAsString}`).getByTestId("required-star");
    if (shouldBeVisible) {
        // generous timeout: this is often the first assertion after a schema loads, so it also
        // waits out the async schema load and tree render
        await expect(requiredIcon).toBeVisible({timeout: 15000});
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
