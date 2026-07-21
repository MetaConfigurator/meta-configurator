import { test, expect } from '@playwright/test';
import {
    openApp, selectInitialSchemaFromExamples,
} from "../../tests/shared/utils";
import {
    addArrayItem,
    editStringProperty,
    reorderArrayItemByDragAndDrop,
    reorderArrayItemByKeyboard,
} from "../../tests/shared/utilsGuiEditor";
import {SessionMode} from "../src/store/sessionMode";
import {tpGetData} from "../../tests/shared/utilsTestPanel";

test('Reorder array items in the GUI editor via drag and drop', async ({ page }) => {
    await openApp(page, 'settings_testpanel.json', null, null)
    await selectInitialSchemaFromExamples(page, 'Feature Testing Schema');

    // Build a nickNames array of ['A', 'B', 'C']
    await addArrayItem(page, ['nickNames'])
    await editStringProperty(page, ['nickNames', 0], 'A')
    await addArrayItem(page, ['nickNames'])
    await editStringProperty(page, ['nickNames', 1], 'B')
    await addArrayItem(page, ['nickNames'])
    await editStringProperty(page, ['nickNames', 2], 'C')

    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['A', 'B', 'C'])

    // Drag 'A' to the very bottom by dropping below the last item -> ['B', 'C', 'A']
    await reorderArrayItemByDragAndDrop(page, ['nickNames', 0], ['nickNames', 2], 'after')
    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['B', 'C', 'A'])

    // Drag 'A' (now last) back to the top by dropping above the first item -> ['A', 'B', 'C']
    await reorderArrayItemByDragAndDrop(page, ['nickNames', 2], ['nickNames', 0], 'before')
    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['A', 'B', 'C'])

    // Drop 'A' between the other two by dropping below the middle item -> ['B', 'A', 'C']
    await reorderArrayItemByDragAndDrop(page, ['nickNames', 0], ['nickNames', 1], 'after')
    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['B', 'A', 'C'])
});

test('Reorder array items in the GUI editor via keyboard arrow keys', async ({ page }) => {
    await openApp(page, 'settings_testpanel.json', null, null)
    await selectInitialSchemaFromExamples(page, 'Feature Testing Schema');

    await addArrayItem(page, ['nickNames'])
    await editStringProperty(page, ['nickNames', 0], 'A')
    await addArrayItem(page, ['nickNames'])
    await editStringProperty(page, ['nickNames', 1], 'B')
    await addArrayItem(page, ['nickNames'])
    await editStringProperty(page, ['nickNames', 2], 'C')

    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['A', 'B', 'C'])

    // Move 'A' down one slot -> ['B', 'A', 'C']
    await reorderArrayItemByKeyboard(page, ['nickNames', 0], 'down')
    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['B', 'A', 'C'])

    // Focus should have followed 'A' to its new slot (index 1), so a second Alt+ArrowDown on the
    // still-focused field moves it again without re-focusing -> ['B', 'C', 'A']
    await expect(page.getByTestId('property-data-nickNames[1]').getByRole('textbox')).toBeFocused()
    await page.keyboard.press('Alt+ArrowDown')
    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['B', 'C', 'A'])
});

test('Keyboard reorder moves the unconfirmed value currently typed in the field', async ({ page }) => {
    await openApp(page, 'settings_testpanel.json', null, null)
    await selectInitialSchemaFromExamples(page, 'Feature Testing Schema');

    await addArrayItem(page, ['nickNames'])
    await editStringProperty(page, ['nickNames', 0], 'A')
    await addArrayItem(page, ['nickNames'])
    await editStringProperty(page, ['nickNames', 1], 'B')

    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['A', 'B'])

    // Type a new value into the first item but do NOT confirm it (no Enter/blur), then move it down.
    // The move must apply to the newly typed value, so the result is ['B', 'Z'], not ['B', 'A'].
    const field = page.getByTestId('property-data-nickNames[0]').getByRole('textbox')
    await field.click()
    await field.fill('Z')
    await field.press('Alt+ArrowDown')
    await expect
        .poll(async () => (await tpGetData(page, SessionMode.DataEditor)).nickNames)
        .toEqual(['B', 'Z'])
});
