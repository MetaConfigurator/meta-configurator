import type {Path, PathElement} from '@/utility/path';
import pointer from 'json-pointer';
import {dataAt} from '@/utility/resolveDataAtPath';

/**
 * Converts a path to a string.
 * Strings are converted to dot notation, numbers to array notation.
 * Example: [1, 'foo', 2] -> '[1].foo[2]'
 *
 * @param path the path to convert
 */
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

/**
 * Converts a path to a json pointer.
 * Example: [1, 'foo', 2] -> '/1/foo/2'
 * @param path the path to convert
 */
export function pathToJsonPointer(path: Path): string {
  return pointer.compile(path.map((element: PathElement) => element.toString()));
}

/**
 * Converts a json pointer to a path.
 * As JsonPointer cannot distinguish between array and object indices,
 * users of this method should expect the returned path to contain only strings.
 *
 * @param jsonPointer The json pointer to convert.
 */
export function jsonPointerToPath(jsonPointer: string): string[] {
  // if it starts with hashtag, remove that hashtag
  if (jsonPointer.startsWith('#')) {
    jsonPointer = jsonPointer.substring(1);
  }
  return pointer.parse(jsonPointer);
}

export function jsonPointerToPathTyped(jsonPointer: string): Path {
  return jsonPointerToPath(jsonPointer).map((element: string) => {
    if (element.match(/^\d+$/)) {
      return parseInt(element);
    } else {
      return element;
    }
  });
}

export function dataPathToSchemaPath(dataPath: Path): Path {
  const schemaPath: Path = [];

  for (const element of dataPath) {
    if (typeof element === 'number') {
      schemaPath.push('items');
    } else {
      schemaPath.push('properties');
      schemaPath.push(element);
    }
  }

  return schemaPath;
}

export function getParentElementRequiredPropsPath(
  schema: any,
  absolutePath: Path
): Path | undefined {
  if (absolutePath.length < 2) {
    return undefined;
  }
  if (absolutePath[absolutePath.length - 2] !== 'properties') {
    return undefined;
  }

  const parentObjectPath = absolutePath.slice(0, -2);
  const parentObject = dataAt(parentObjectPath, schema);
  if (parentObject.required) {
    return parentObjectPath.concat('required');
  }

  return undefined;
}

export function arePathsEqual(path1: Path, path2: Path): boolean {
  if (path1.length !== path2.length) {
    return false;
  }

  for (let i = 0; i < path1.length; i++) {
    if (path1[i] !== path2[i]) {
      return false;
    }
  }

  return true;
}
