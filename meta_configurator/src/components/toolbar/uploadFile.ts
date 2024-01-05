import {useFileDialog} from '@vueuse/core';
import {readFileContentToDataLink} from '@/utility/readFileContent';
import type {DataLink} from '@/data/dataLink';
import {getDataLinkForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionStore';

/**
 * Opens a file dialog to select a file to upload.
 *
 * @param resultDataLink The DataLink to which the file content should be written
 */
export function openUploadFileDialog(resultDataLink: DataLink): void {
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
  return openUploadFileDialog(getDataLinkForMode(SessionMode.SchemaEditor));
}
