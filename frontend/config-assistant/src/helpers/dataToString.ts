/**
 * Converts data to a string representation that can be used in the UI.
 *
 * @param data the data to convert, of any type
 * @param currentDepth internal parameter that takes care of not using too deeply nested data in
 * the string representation. Should not be used by the caller.
 * @param limit max number of character to describe the data
 */
export function dataToString(data: any, currentDepth = 0, limit?: number): string {
  let result = '';
  if (data === null) {
    result = 'null';
  }
  if (data === undefined) {
    result = '';
  }
  if (typeof data === 'string') {
    result = data;
  }
  if (typeof data === 'number' || typeof data === 'boolean') {
    result = data.toString();
  }
  if (Array.isArray(data)) {
    if (currentDepth >= 2) {
      result = '...';
    }
    result = data.map((value: any) => dataToString(value, currentDepth + 1, limit)).join(', ');
  }
  if (typeof data === 'object') {
    if (currentDepth >= 2) {
      result = '...';
    }
    result = Object.entries(data)
      .map(([key, value]) => `${key}: ${dataToString(value, currentDepth + 1, limit)}`)
      .join(', ');
  }
  if (limit !== undefined && result.length > limit) {
    result = result.slice(0, limit) + '...';
  }

  return result;
}
