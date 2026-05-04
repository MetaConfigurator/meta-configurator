import {readFileContentToDataLink} from '@/utility/readFileContent';
import {getDataForMode} from '@/data/useDataLink';
import type {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {createLazySingleFileDialog} from '@/utility/fileDialogUtils';

const uploadDataFileDialog = createLazySingleFileDialog('.json, .yaml, .yml, .xml, .schema.json');

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
