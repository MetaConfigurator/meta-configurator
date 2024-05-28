import type {Path, PathElement} from '@/utility/path';
import pointer from 'json-pointer';

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
 * Converts a json pointer to a path.
 * As JsonPointer cannot distinguish between array and object indices,
 * users of this method should expect the returned path to contain only strings.
 *
 * @param jsonPointer The json pointer to convert.
 */
export function jsonPointerToPath(jsonPointer: string): string[] {
  return pointer.parse(jsonPointer);
}

/**
 * Converts a path to a json pointer.
 * Example: [1, 'foo', 2] -> '/1/foo/2'
 * @param path the path to convert
 */
export function pathToJsonPointer(path: Path): string {
  return pointer.compile(path.map((element: PathElement) => element.toString()));
}
