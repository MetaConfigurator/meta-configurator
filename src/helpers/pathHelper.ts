import type {Path, PathElement} from '@/model/path';

export function pathToString(path: Path) {
  return path.length === 0
    ? undefined
    : path
        .reduce(
          (prev: string, val: PathElement) =>
            prev + (typeof val === 'number' ? `[${val}]` : `.${val}`),
          ''
        )
        .slice(1);
}
