export function pathToString(path: Array<string | number>) {
  return path.length === 0
    ? undefined
    : path
        .reduce(
          (prev: string, val: string | number) =>
            prev + (typeof val === 'number' ? `[${val}]` : `.${val}`),
          ''
        )
        .slice(1);
}
