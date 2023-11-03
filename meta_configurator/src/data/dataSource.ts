import {ref} from 'vue';
import {defaultSettingsData} from '@/settings/defaultSettingsData';

const dataSource = {
  // data of the file editor
  userData: ref<any>({}), // TODO use shallowRef
  // data of the schema editor, used as the schema for the file editor
  userSchemaData: ref<any>({
    title: 'No schema loaded',
  }),
  // data of the settings editor
  settingsData: ref<any>(defaultSettingsData), // TODO add settings type
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
