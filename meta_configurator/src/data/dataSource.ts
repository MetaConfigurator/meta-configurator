import {computed, shallowRef} from 'vue';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {buildMetaSchema} from '@/schema/metaSchemaBuilder';
import {SETTINGS_SCHEMA} from '@/settings/settingsSchema';
import {useLocalStorage} from '@vueuse/core';

const dataSource = {
  // data of the data editor
  userData: shallowRef<any>({}),
  // data of the schema editor, used as the schema for the file editor
  userSchemaData: shallowRef<any>({
    title: 'No schema loaded',
  }),

  // data of the settings editor
  settingsData: useLocalStorage('settingsData', structuredClone(SETTINGS_DATA_DEFAULT)), // TODO add settings type
};

// Schema source and data source are separated, because metaSchemaData accesses the settingsData, which it could not do if they were defined within the same object.
const schemaSource = {
  // restricted meta schema of the schema editor
  metaSchemaData: computed(() => buildMetaSchema(dataSource.settingsData.value.metaSchema)),

  // settings schema of the settings editor
  settingsSchemaData: shallowRef<TopLevelSchema>(SETTINGS_SCHEMA), // TODO add settings schema type
};

/**
 * The data source contains the basic, unprocessed data as JSON objects.
 * The data is stored in shallow refs, so any update on sub properties of the data
 * will not be detected, unless `triggerRef` is used.
 * Use this to access the data source only for reading or call `triggerRef` after
 * updating the data.
 */
export function useDataSource() {
  return dataSource;
}

export function useSchemaSource() {
  return schemaSource;
}
