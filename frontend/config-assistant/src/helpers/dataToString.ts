/**
 * Converts data to a string representation that can be used in the UI.
 *
 * @param data the data to convert, of any type
 * @param currentDepth internal parameter that takes care of not using too deeply nested data in
 * the string representation. Should not be used by the caller.
 */
export function dataToString(data: any, currentDepth = 0): string {
  if (data === null) {
    return 'null';
  }
  if (data === undefined) {
    return '';
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data.toString();
  }
  if (Array.isArray(data)) {
    if (currentDepth >= 2) {
      return '...';
    }
    return data.map((value: any) => dataToString(value, currentDepth + 1)).join(', ');
  }
  if (typeof data === 'object') {
    if (currentDepth >= 2) {
      return '...';
    }
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${dataToString(value, currentDepth + 1)}`)
      .join(', ');
  }
  return '';
}
