import {errorService} from '@/main';
import type {DataLink} from '@/data/dataLink';

/**
 * Reads the content of a file as a string.
 * @param file the file
 */
export async function readFileContent(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error(`Could not read file ${file.name}`));
      }
    };
    reader.onerror = () => {
      reject(new Error(`Could not read file ${file.name}`));
    };
    reader.readAsText(file);
  });
}

export async function readFileContentFromFileList(files: FileList | File[] | null) {
  if (files === null || typeof files !== 'object') {
    return Promise.resolve();
  }
  if (files.length !== 1) {
    return Promise.reject(new Error('Please select exactly one file'));
  }
  const file = files[0];
  return readFileContent(file);
}

export function readFileContentToDataLink(
  files: FileList | File[] | null,
  dataLink: DataLink
): void {
  readFileContentFromFileList(files)
    .then(contents => {
      if (contents === undefined) {
        return;
      }
      dataLink.unparsedData.value = contents;
    })
    .catch(error => errorService.onError(error));
}
