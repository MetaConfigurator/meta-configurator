/**
 * Returns a copy of the array with the item at index `from` moved to index `to`, where `to` is
 * the final index in the result. Out-of-range or no-op moves return an unchanged copy.
 * Example: from 0 to 2 in [A,B,C,D] gives [B,C,A,D].
 */
export function moveArrayItem<T>(array: T[], from: number, to: number): T[] {
  const result = array.slice();
  const lastIndex = result.length - 1;
  if (from < 0 || from > lastIndex || to < 0 || to > lastIndex || from === to) {
    return result;
  }
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item!); // guaranteed defined: `from` is within bounds
  return result;
}
