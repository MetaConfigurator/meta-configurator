import {shallowRef} from 'vue';
import {defaultSettingsData} from '@/settings/defaultSettingsData';
import {simplifiedMetaSchema} from '../../resources/json-schema/simplifiedMetaSchema';
import {SETTINGS_SCHEMA} from '@/example-schemas/settingsSchema';

const dataSource = {
  // data of the file editor
  userData: shallowRef<any>({}), // TODO use shallowRef
  // data of the schema editor, used as the schema for the file editor
  userSchemaData: shallowRef<any>({
    title: 'No schema loaded',
  }),
  // meta schema of the schema editor
  metaSchemaData: shallowRef<any>(simplifiedMetaSchema), // TODO use shallowRef
  // data of the settings editor
  settingsData: shallowRef<any>(defaultSettingsData), // TODO add settings type
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
