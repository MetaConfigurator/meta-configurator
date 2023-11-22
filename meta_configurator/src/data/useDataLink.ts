import {DataLink} from '@/data/dataLink';
import {useDataSource} from '@/data/dataSource';
import {SessionMode, useSessionStore} from '@/store/sessionStore';
import type {ComputedRef} from 'vue';
import {computed} from 'vue';

const dataSource = useDataSource();
const fileEditorDataLink = new DataLink(dataSource.userData, dataSource.userSchemaData);
const schemaEditorDataLink = new DataLink(dataSource.userSchemaData, dataSource.metaSchemaData);
const settingsEditorDataLink = new DataLink(dataSource.settingsData, dataSource.settingsSchemaData);

/**
 * Returns the data link for the given mode
 * @param mode the mode
 * @throws Error if the mode is unknown
 */
export function getDataLinkForMode(mode: SessionMode): DataLink {
  switch (mode) {
    case SessionMode.FileEditor:
      return fileEditorDataLink;
    case SessionMode.SchemaEditor:
      return schemaEditorDataLink;
    case SessionMode.Settings:
      return settingsEditorDataLink;
    default:
      throw new Error(`Unknown mode ${mode}`);
  }
}

const currentEditorDataLink: ComputedRef<DataLink> = computed(() =>
  getDataLinkForMode(useSessionStore().currentMode)
);

/**
 * Returns the data link for the currently active editor.
 */
export function useCurrentDataLink() {
  return currentEditorDataLink.value;
}
