import {useDataSource} from '@/data/dataSource';
import {useSessionStore} from '@/store/sessionStore';
import type {ComputedRef} from 'vue';
import {computed} from 'vue';
import {ManagedData} from '@/data/managedData';
import {ManagedSchema} from '@/data/managedSchema';
import {SessionMode} from '@/model/sessionMode';

const dataSource = useDataSource();

const managedUserData = new ManagedData(dataSource.userData);
const managedSchemaData = new ManagedData(dataSource.userSchemaData);
const managedSettingsData = new ManagedData(dataSource.userData);
const managedUserSchema = new ManagedSchema(dataSource.userSchemaData, true);
const managedMetaSchema = new ManagedSchema(dataSource.metaSchemaData, true);
const managedSettingsSchema = new ManagedSchema(dataSource.settingsSchemaData, false);

/**
 * Returns the data link for the given mode
 * @param mode the mode
 * @throws Error if the mode is unknown
 */
export function getDataForMode(mode: SessionMode): ManagedData {
  switch (mode) {
    case SessionMode.FileEditor:
      return managedUserData;
    case SessionMode.SchemaEditor:
      return managedSchemaData;
    case SessionMode.Settings:
      return managedSettingsData;
    default:
      throw new Error(`Unknown mode ${mode}`);
  }
}

export function getSchemaForMode(mode: SessionMode): ManagedSchema {
  switch (mode) {
    case SessionMode.FileEditor:
      return managedUserSchema;
    case SessionMode.SchemaEditor:
      return managedMetaSchema;
    case SessionMode.Settings:
      return managedSettingsSchema;
    default:
      throw new Error(`Unknown mode ${mode}`);
  }
}

const currentEditorData: ComputedRef<ManagedData> = computed(() =>
  getDataForMode(useSessionStore().currentMode)
);

const currentEditorSchema: ComputedRef<ManagedSchema> = computed(() =>
  getSchemaForMode(useSessionStore().currentMode)
);

/**
 * Returns the data link for the currently active editor.
 */
export function useCurrentData() {
  return currentEditorData.value;
}

export function useCurrentSchema() {
  return currentEditorSchema.value;
}
