import {readFileContentForFunction, readFileContentToDataLink} from '@/utility/readFileContent';
import {getDataForMode} from '@/data/useDataLink';
import type {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {createLazySingleFileDialog} from '@/utility/fileDialogUtils';
import {updateSettingsWithDefaults} from '@/settings/settingsUpdater';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';

const uploadDataFileDialog = createLazySingleFileDialog('.json, .yaml, .yml, .xml, .schema.json');
const uploadSettingsFileDialog = createLazySingleFileDialog('.json, .yaml, .yml');

/**
 * Opens a file dialog to select a file to upload.
 *
 * @param resultDataLink The DataLink to which the file content should be written
 */
export function openUploadFileDialog(resultDataLink: ManagedData): void {
  uploadDataFileDialog.openForSelection(files => {
    readFileContentToDataLink(files, resultDataLink);
  });
}

/**
 * Opens a file dialog to select a file to upload.
 */
export function openUploadSchemaDialog(): void {
  return openUploadFileDialog(getDataForMode(SessionMode.SchemaEditor));
}

/**
 * Opens a file dialog to select a settings file to upload.
 */
export function openUploadSettingsDialog(): void {
  uploadSettingsFileDialog.openForSelection(files => {
    readFileContentForFunction(files, settings => {
      const defaultSettings: any = structuredClone(SETTINGS_DATA_DEFAULT);
      getDataForMode(SessionMode.Settings).setData(
        updateSettingsWithDefaults(settings, defaultSettings)
      );
    });
  });
}
