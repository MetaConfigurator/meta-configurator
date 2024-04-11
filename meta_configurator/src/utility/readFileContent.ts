import {errorService} from '@/main';
import type {ManagedData} from '@/data/managedData';

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

async function readFileContentFromFileList(files: FileList | File[] | null) {
  if (files === null || typeof files !== 'object') {
    return Promise.resolve();
  }
  if (files.length !== 1) {
    return Promise.reject(new Error('Please select exactly one file'));
  }
  const file = files[0];
  return readFileContent(file);
}

/**
 * Reads the content of the given file and sets it as the data of the given data link.
 * This method is asynchronous, so the data link will probably not be updated immediately.
 * If the file could not be read, an error is shown.
 *
 * @param files    the files to read. Will throw an error if there is more than one file.
 *                 If null or undefined, nothing happens.
 * @param dataLink the data link to set the data of
 */
export function readFileContentToDataLink(
  files: FileList | File[] | null,
  dataLink: ManagedData
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
