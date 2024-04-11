import {shallowRef} from 'vue';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import {META_SCHEMA_SIMPLIFIED} from '@/packaged-schemas/metaSchemaSimplified';
import {META_SCHEMA_SIMPLIFIED_RESTRICTED} from '@/packaged-schemas/metaSchemaSimplifiedRestricted';
import {SETTINGS_SCHEMA} from '@/packaged-schemas/settingsSchema';

const dataSource = {
  // data of the file editor
  userData: shallowRef<any>({}),
  // data of the schema editor, used as the schema for the file editor
  userSchemaData: shallowRef<any>({
    title: 'No schema loaded',
  }),
  // meta schema of the schema editor
  metaSchemaData: shallowRef<any>(META_SCHEMA_SIMPLIFIED),
  // restricted (simpler and less expressive) meta schema of the schema editor
  metaSchemaRestrictedData: shallowRef<any>(META_SCHEMA_SIMPLIFIED_RESTRICTED),
  // data of the settings editor
  settingsData: shallowRef<any>(SETTINGS_DATA_DEFAULT), // TODO add settings type
  // settings schema of the settings editor
  settingsSchemaData: shallowRef<any>(SETTINGS_SCHEMA), // TODO add settings schema type
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
