import type {Path, PathElement} from '@/model/path';
import pointer from 'json-pointer';
import {useSessionStore} from '@/store/sessionStore';

export function dataAt(path: Path, data: any): any {
  let currentData: any = data;

  if (currentData === undefined) {
    return undefined;
  }

  for (const key of path) {
    if (currentData[key] === undefined) {
      return undefined;
    }
    currentData = currentData[key];
  }

  return currentData;
}

export function pathToString(path: Path): string {
  return path.length === 0
    ? ''
    : path
        .reduce(
          (prev: string, val: PathElement) =>
            prev + (typeof val === 'number' ? `[${val}]` : `.${val}`),
          ''
        )
        .slice(1);
}
export function convertAjvPathToPath(path: string): Path {
  return jsonPointerToPath(path);
}

/**
 * Converts a json pointer to a path.
 * As JsonPointer cannot distinguish between array and object indices,
 * this method will try to resolve the path by looking at the data.
 * If the data is an array, the index will be parsed as a number.
 * If the data is an object, the index will be parsed as a string.
 * If the data is undefined, the index will be parsed as a string too.
 *
 * @param jsonPointer The json pointer to convert.
 */
export function jsonPointerToPath(jsonPointer: string): Path {
  const basePointer: string[] = pointer.parse(jsonPointer);

  const result: Path = [];
  for (const element of basePointer) {
    const actualData = useSessionStore().dataAtPath(result);
    if (actualData === undefined) {
      result.push(element);
      continue;
    }
    if (Array.isArray(actualData)) {
      result.push(parseInt(element));
    } else {
      result.push(element);
    }
  }
  return result;
}

export function pathToJsonPointer(path: Path): string {
  return pointer.compile(path.map((element: PathElement) => element.toString()));
}
