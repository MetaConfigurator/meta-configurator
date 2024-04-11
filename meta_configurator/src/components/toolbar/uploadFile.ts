import {useFileDialog} from '@vueuse/core';
import {readFileContentToDataLink} from '@/utility/readFileContent';
import {getDataForMode} from '@/data/useDataLink';
import type {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/model/sessionMode';

/**
 * Opens a file dialog to select a file to upload.
 *
 * @param resultDataLink The DataLink to which the file content should be written
 */
export function openUploadFileDialog(resultDataLink: ManagedData): void {
  const {open, onChange} = useFileDialog();

  onChange((files: FileList | null) => {
    readFileContentToDataLink(files, resultDataLink);
  });

  open();
}

/**
 * Opens a file dialog to select a file to upload.
 */
export function openUploadSchemaDialog(): void {
  return openUploadFileDialog(getDataForMode(SessionMode.SchemaEditor));
}
