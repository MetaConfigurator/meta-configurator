import type {Path, PathElement} from '@/model/path';

export function dataAt(path: Path, data: any): any {
  let currentData: any = data;

  for (const key of path) {
    if (currentData[key] === undefined) {
      return undefined;
    }
    currentData = currentData[key];
  }

  return currentData;
}

export function absolutePathToParentPath(absPath: Path, relativePath: Path): Path {
  if (absPath.length <= relativePath.length) {
    return [];
  }
  return absPath.slice(0, absPath.length - relativePath.length);
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
