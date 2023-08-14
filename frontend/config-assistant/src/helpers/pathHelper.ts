import type {Path, PathElement} from '@/model/path';

export function dataAt(path: Path, data: any): any {
  let currentData: any = data;

  for (const key of path) {
    if (!currentData[key]) {
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
