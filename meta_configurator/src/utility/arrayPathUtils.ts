// note that this function does not look for a table within a table
import type {Path} from '@/utility/path';

export function identifyArraysInJson(
  json: any,
  path: Path = [],
  allowNestedArrays: boolean,
  onlyObjectArray: boolean
): Path[] {
  const arrayPaths: Path[] = [];

  if (
    Array.isArray(json) &&
    (!onlyObjectArray || (json.length > 0 && typeof json[0] === 'object'))
  ) {
    arrayPaths.push(path);
    if (allowNestedArrays) {
      // for each array element, recursively search for nested arrays
      for (let i = 0; i < json.length; i++) {
        arrayPaths.push(
          ...identifyArraysInJson(json[i], [...path, i], allowNestedArrays, onlyObjectArray)
        );
      }
    }
  } else if (typeof json === 'object' && json !== null) {
    // for each key, recursively search for nested arrays
    for (const key in json) {
      if (json.hasOwnProperty(key)) {
        arrayPaths.push(
          ...identifyArraysInJson(json[key], [...path, key], allowNestedArrays, onlyObjectArray)
        );
      }
    }
  }

  return arrayPaths;
}
