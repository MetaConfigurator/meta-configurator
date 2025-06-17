import {useFileDialog} from '@vueuse/core';
import {readFileContentToDataLink} from '@/utility/readFileContent';
import {getDataForMode} from '@/data/useDataLink';
import type {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';

/**
 * Opens a file dialog to select a file to upload.
 *
 * @param resultDataLink The DataLink to which the file content should be written
 */
export function openUploadFileDialog(resultDataLink: ManagedData): void {
  const {open, onChange, reset} = useFileDialog({
    // accept only json, schema.json, yaml, yml, xml and xsd files
    accept: '.json, .yaml, .yml, .xml, .schema.json',
    multiple: false,
  });

  onChange((files: FileList | null) => {
    readFileContentToDataLink(files, resultDataLink);
    reset(); // Reset the file dialog after selection
  });

  // opening it with a small delay might fix the issue of the dialog opening but onChange never triggering
  setTimeout(() => {
    open();
  }, 3);
}

/**
 * Opens a file dialog to select a file to upload.
 */
export function openUploadSchemaDialog(): void {
  return openUploadFileDialog(getDataForMode(SessionMode.SchemaEditor));
}
