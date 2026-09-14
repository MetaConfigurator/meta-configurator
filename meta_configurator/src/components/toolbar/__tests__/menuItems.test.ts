import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {MenuItem} from 'primevue/menuitem';

// the real data link starts validation web workers on import, which jsdom does not provide
vi.mock('@/data/useDataLink', async () => {
  const {ref} = await import('vue');
  const dataByMode: Record<string, {value: unknown}> = {
    dataEditor: ref<unknown>({}),
    schemaEditor: ref<unknown>({}),
    settings: ref<unknown>({}),
  };
  return {
    editorData: dataByMode,
    getDataForMode: (mode: string) => ({data: dataByMode[mode]}),
    getSessionForMode: () => ({}),
    useCurrentData: () => ({undoManager: {canUndo: ref(false), canRedo: ref(false)}}),
  };
});

import * as useDataLink from '@/data/useDataLink';
import {MenuItems, type MenuItemDialogActions} from '../menuItems';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';

// the editor content the mocked data link serves to the menu entries
const editorData = (
  useDataLink as unknown as {
    editorData: {
      dataEditor: {value: unknown};
      schemaEditor: {value: unknown};
      settings: {value: unknown};
    };
  }
).editorData;

// the menu entries only reference the dialog actions, they are never invoked here
const menuItems = new MenuItems({} as MenuItemDialogActions);
const settings = SETTINGS_DATA_DEFAULT as unknown as SettingsInterfaceRoot;

function findItem(items: MenuItem[], label: string): MenuItem | undefined {
  for (const item of items) {
    if (item.label === label) {
      return item;
    }
    const nested = item.items ? findItem(item.items, label) : undefined;
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

function isDisabled(items: MenuItem[], label: string): boolean {
  const item = findItem(items, label);
  expect(item, `menu item "${label}" not found`).toBeDefined();
  return typeof item!.disabled === 'function' ? item!.disabled() : Boolean(item!.disabled);
}

describe('menu items react to the loaded data and schema', () => {
  beforeEach(() => {
    editorData.dataEditor.value = {};
    editorData.schemaEditor.value = {};
  });

  it('disables the data actions while no data is loaded', () => {
    const items = menuItems.getDataEditorMenuItems(settings);

    expect(isDisabled(items, 'Export Data...')).toBe(true);
    expect(isDisabled(items, 'Utility...')).toBe(true);
    expect(isDisabled(items, 'Clear Data')).toBe(true);
    expect(isDisabled(items, 'Share Snapshot...')).toBe(true);
    // importing data is what the user needs to do next, so it stays available
    expect(isDisabled(items, 'Open / Import Data...')).toBe(false);
  });

  it('disables the schema actions while no schema is loaded', () => {
    const items = menuItems.getSchemaEditorMenuItems(settings);

    expect(isDisabled(items, 'Export Schema...')).toBe(true);
    expect(isDisabled(items, 'Generate Source Code...')).toBe(true);
    expect(isDisabled(items, 'Utility...')).toBe(true);
    expect(isDisabled(items, 'Clear Schema')).toBe(true);
    expect(isDisabled(items, 'Open / Import Schema...')).toBe(false);
  });

  it('enables them again once data and schema are loaded', () => {
    editorData.dataEditor.value = {name: 'Ada'};
    editorData.schemaEditor.value = {type: 'object'};

    const dataItems = menuItems.getDataEditorMenuItems(settings);
    expect(isDisabled(dataItems, 'Export Data...')).toBe(false);
    expect(isDisabled(dataItems, 'Utility...')).toBe(false);
    expect(isDisabled(dataItems, 'Share Snapshot...')).toBe(false);

    const schemaItems = menuItems.getSchemaEditorMenuItems(settings);
    expect(isDisabled(schemaItems, 'Export Schema...')).toBe(false);
    expect(isDisabled(schemaItems, 'Generate Source Code...')).toBe(false);
  });

  it('disables the entries that need the content of the other editor', () => {
    editorData.schemaEditor.value = {type: 'object'};

    // schema present, data still empty
    expect(isDisabled(menuItems.getDataEditorMenuItems(settings), 'Generate Data...')).toBe(false);
    const schemaItems = menuItems.getSchemaEditorMenuItems(settings);
    expect(isDisabled(schemaItems, 'Infer Schema from Data...')).toBe(true);
    expect(isDisabled(schemaItems, 'Refine Schema based on Data...')).toBe(true);
  });
});
