import type {Path} from '@/utility/path';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';

export function pathToNormalizedJsonPointer(
  path: Path,
  replaceIndexByPlaceholder: boolean
): string {
  let resultPath = path;
  if (replaceIndexByPlaceholder) {
    let arrayIndex = 0;
    resultPath = resultPath.map(seg => {
      if (typeof seg === 'number') {
        const placeholder = String.fromCharCode(65 + arrayIndex);
        arrayIndex += 1;
        return `%INDEX_${placeholder}%`;
      }
      return seg;
    });
  }

  return '/' + resultPath.join('/');
}

export function normalizeJsonPointer(
  jsonPointer: string,
  replaceIndexByPlaceholder: boolean
): string {
  let normalizedJsonPointer = jsonPointer;
  if (normalizedJsonPointer.startsWith('#')) {
    normalizedJsonPointer = normalizedJsonPointer.slice(1);
  }
  if (!normalizedJsonPointer.startsWith('/')) {
    normalizedJsonPointer = '/' + normalizedJsonPointer;
  }

  const pathTyped = jsonPointerToPathTyped(normalizedJsonPointer);
  return pathToNormalizedJsonPointer(pathTyped, replaceIndexByPlaceholder);
}
