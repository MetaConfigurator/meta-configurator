import type {Path} from '@/utility/path';

/**
 * Returns the data at the given path. If no data is found, undefined is returned.
 *
 * @param path the path to the data
 * @param data the data to search in
 */
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
