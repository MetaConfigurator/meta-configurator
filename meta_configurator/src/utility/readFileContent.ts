import {errorService} from '@/main';
import type {ManagedData} from '@/data/managedData';
import type {Ref} from 'vue';
import {formatRegistry} from '@/dataformats/formatRegistry';
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

async function readFileContentFromFileList(
  files: FileList | File[] | null,
  parseInput: boolean
): Promise<any | void | string> {
  if (files === null || typeof files !== 'object') {
    return Promise.resolve();
  }
  if (files.length !== 1) {
    return Promise.reject(new Error('Please select exactly one file'));
  }
  const file = files[0];
  const fileContentAsString = readFileContent(file);

  if (parseInput) {
    // parse the file content depending on the file suffix
    const fileName = file.name;
    for (const formatName of formatRegistry.getFormatNames()) {
      if (fileName.toLowerCase().endsWith(formatName.toLowerCase())) {
        return formatRegistry.getFormat(formatName).dataConverter.parse(await fileContentAsString);
      }
    }
    throw new Error(`Unknown file format: ${fileName}`);
  } else {
    return fileContentAsString;
  }
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
  readFileContentFromFileList(files, true)
    .then(contents => {
      if (contents === undefined) {
        return;
      }
      dataLink.setData(contents as any);
    })
    .catch(error => errorService.onError(error));
}

export async function readFileContentToStringRef(
  files: FileList | File[] | null,
  resultRef: Ref<string>
) {
  try {
    let contents = (await readFileContentFromFileList(files, false)) as string | void;
    if (contents !== undefined) {
      resultRef.value = contents;
    }
  } catch (error) {
    errorService.onError(error);
  }
}

export function readFileContentForFunction(
  files: FileList | File[] | null,
  fct: (content: any) => void
) {
  readFileContentFromFileList(files, true)
    .then(contents => {
      if (contents !== undefined) {
        fct(contents as any);
      }
    })
    .catch(error => {
      errorService.onError(error);
    });
}
