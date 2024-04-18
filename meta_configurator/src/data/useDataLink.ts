import {useDataSource, useSchemaSource} from '@/data/dataSource';
import {useSessionStore} from '@/store/sessionStore';
import type {ComputedRef} from 'vue';
import {computed} from 'vue';
import {SessionMode} from '@/store/sessionMode';
import {ManagedData} from '@/data/managedData';
import {ManagedJsonSchema} from '@/data/managedJsonSchema';
import {ManagedSession} from '@/data/managedSession';
import {ManagedValidation} from '@/data/managedValidation';
import {ManagedUserSchemaSelection} from '@/data/managedUserSchemaSelection';

const dataSource = useDataSource();
const schemaSource = useSchemaSource();

const dataList: ManagedData[] = [
  new ManagedData(dataSource.userData, SessionMode.FileEditor),
  new ManagedData(dataSource.userSchemaData, SessionMode.SchemaEditor),
  new ManagedData(dataSource.settingsData, SessionMode.Settings),
];

const schemaList: ManagedJsonSchema[] = [
  new ManagedJsonSchema(dataSource.userSchemaData, true, SessionMode.FileEditor),
  new ManagedJsonSchema(schemaSource.metaSchemaData, true, SessionMode.SchemaEditor),
  new ManagedJsonSchema(schemaSource.settingsSchemaData, false, SessionMode.Settings),
];

const sessionList: ManagedSession[] = [
  new ManagedSession(SessionMode.FileEditor),
  new ManagedSession(SessionMode.SchemaEditor),
  new ManagedSession(SessionMode.Settings),
];

const validationList: ManagedValidation[] = [
  new ManagedValidation(SessionMode.FileEditor),
  new ManagedValidation(SessionMode.SchemaEditor),
  new ManagedValidation(SessionMode.Settings),
];

const userSelectionList: ManagedUserSchemaSelection[] = [
  new ManagedUserSchemaSelection(SessionMode.FileEditor),
  new ManagedUserSchemaSelection(SessionMode.SchemaEditor),
  new ManagedUserSchemaSelection(SessionMode.Settings),
];

/**
 * Returns the data link for the given mode
 * @param mode the mode
 * @throws Error if the mode is unknown
 */
export function getDataForMode(mode: SessionMode): ManagedData {
  for (const data of dataList) {
    if (data.mode === mode) {
      return data;
    }
  }
  throw new Error(`Unknown mode ${mode}`);
}

export function getSchemaForMode(mode: SessionMode): ManagedJsonSchema {
  for (const schema of schemaList) {
    if (schema.mode === mode) {
      return schema;
    }
  }
  throw new Error(`Unknown mode ${mode}`);
}

export function getSessionForMode(mode: SessionMode): ManagedSession {
  for (const session of sessionList) {
    if (session.mode === mode) {
      return session;
    }
  }
  throw new Error(`Unknown mode ${mode}`);
}

export function getValidationForMode(mode: SessionMode): ManagedValidation {
  for (const validation of validationList) {
    if (validation.mode === mode) {
      return validation;
    }
  }
  throw new Error(`Unknown mode ${mode}`);
}

export function getUserSelectionForMode(mode: SessionMode): ManagedUserSchemaSelection {
  for (const userSelection of userSelectionList) {
    if (userSelection.mode === mode) {
      return userSelection;
    }
  }
  throw new Error(`Unknown mode ${mode}`);
}

const currentEditorData: ComputedRef<ManagedData> = computed(() =>
  getDataForMode(useSessionStore().currentMode)
);

const currentEditorSchema: ComputedRef<ManagedJsonSchema> = computed(() =>
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
