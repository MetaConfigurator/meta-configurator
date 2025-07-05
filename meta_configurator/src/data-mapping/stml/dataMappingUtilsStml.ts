import type {Path} from '@/utility/path';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';

export function pathToNormalizedJsonPointer(
  path: Path,
  replaceIndexByPlaceholder: boolean
): string {
  let resultPath = path;
  if (replaceIndexByPlaceholder) {
    // replace all array indices (numbers in the path) by a %INDEX_A%, %INDEX_B%,... placeholder
    // first array index is %INDEX_A%, second %INDEX_B%, third %INDEX_C% and so on
    let arrayIndex = 0;
    resultPath = resultPath.map(seg => {
      if (typeof seg === 'number') {
        const placeholder = String.fromCharCode(65 + arrayIndex); // 65 is ASCII for 'A'
        arrayIndex++;
        return `%INDEX_${placeholder}%`;
      }
      return seg;
    });
  }

  // then convert path to json pointer
  // note that we do not use the library call here, because the library does not support the %INDEX_X% placeholders
  return '/' + resultPath.join('/');
}

export function normalizeJsonPointer(
  jsonPointer: string,
  replaceIndexByPlaceholder: boolean
): string {
  // for each path, if it starts with a hashtag, remove the hashtag. In the mappings and also transformations
  // if the path starts without a slash '/', then add a '/' at the beginning
  if (jsonPointer.startsWith('#')) {
    jsonPointer = jsonPointer.slice(1);
  }
  if (!jsonPointer.startsWith('/')) {
    jsonPointer = '/' + jsonPointer;
  }

  const pathTyped = jsonPointerToPathTyped(jsonPointer);
  return pathToNormalizedJsonPointer(pathTyped, replaceIndexByPlaceholder);
}
