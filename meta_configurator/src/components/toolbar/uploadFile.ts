import {
  readFileContent,
  readFileContentForFunction,
  readFileContentToDataLink,
} from '@/utility/readFileContent';
import {getDataForMode} from '@/data/useDataLink';
import type {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {createLazySingleFileDialog} from '@/utility/fileDialogUtils';
import {updateSettingsWithDefaults} from '@/settings/settingsUpdater';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import {
  detectFormatAndParseWithFormatProcessing,
  FORMAT_PROCESSING_FILE_ACCEPT,
} from '@/utility/backend/formatProcessingApi';
import {useErrorService} from '@/utility/errorServiceInstance';

const uploadDataFileDialog = createLazySingleFileDialog('.json, .yaml, .yml');
const importOtherDataFileDialog = createLazySingleFileDialog(FORMAT_PROCESSING_FILE_ACCEPT);
const uploadSchemaFileDialog = createLazySingleFileDialog('.json, .yaml, .yml, .schema.json');
const uploadSettingsFileDialog = createLazySingleFileDialog('.json, .yaml, .yml');

/** Parses a file of a format only the format processing service understands. */
async function importDataFileViaFormatProcessing(
  files: FileList | File[] | null,
  resultDataLink: ManagedData
): Promise<void> {
  const file = files === null || typeof files !== 'object' ? undefined : files[0];
  if (!file || files!.length !== 1) {
    useErrorService().onError(new Error('Please select exactly one file'));
    return;
  }

  try {
    const content = await readFileContent(file);
    const result = await detectFormatAndParseWithFormatProcessing(file.name, file.type, content);
    if (!result.recognized || result.parsed_json === null) {
      throw new Error(
        result.message || 'The format processing service could not parse the selected file.'
      );
    }
    resultDataLink.setData(result.parsed_json);
  } catch (error) {
    useErrorService().onError(error);
  }
}

/**
 * Opens a file dialog to select a file to upload.
 *
 * @param resultDataLink The DataLink to which the file content should be written
 */
export function openUploadFileDialog(resultDataLink: ManagedData): void {
  const fileDialog =
    resultDataLink.mode === SessionMode.DataEditor ? uploadDataFileDialog : uploadSchemaFileDialog;
  fileDialog.openForSelection(files => {
    readFileContentToDataLink(files, resultDataLink);
  });
}

/**
 * Opens a file dialog for the data formats that only the format processing service can
 * parse, such as XML, TOML, CSV or STAR/CIF.
 */
export function openImportOtherDataDialog(): void {
  const dataEditorLink = getDataForMode(SessionMode.DataEditor);
  importOtherDataFileDialog.openForSelection(files => {
    void importDataFileViaFormatProcessing(files, dataEditorLink);
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
