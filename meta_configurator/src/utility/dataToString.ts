/**
 * Converts data to a string representation that can be used in the UI.
 *
 * @param data the data to convert, of any type
 * @param currentDepth internal parameter that takes care of not using too deeply nested data in
 * the string representation. Can be used to limit the depth of the string representation.
 * @param limit max number of character to describe the data
 */
export function dataToString(data: any, currentDepth = 0, limit?: number): string {
  if (data === null) {
    return fitLength('null', limit);
  }
  if (data === undefined) {
    return fitLength('', limit);
  }
  if (typeof data === 'string') {
    return fitLength(data, limit);
  }
  if (typeof data === 'number' || typeof data === 'boolean') {
    return fitLength(data.toString(), limit);
  }
  if (currentDepth >= 2) {
    return '...';
  }
  if (Array.isArray(data)) {
    const arrayDescription: string = data
      .map((value: any) => dataToString(value, currentDepth + 1, limit))
      .join(', ');
    return fitLength(arrayDescription, limit);
  }
  if (typeof data === 'object') {
    const objectDescription = Object.entries(data)
      .map(([key, value]) => `${key}: ${dataToString(value, currentDepth + 1, limit)}`)
      .join(', ');
    return fitLength(objectDescription, limit);
  }

  return '...';
}

function fitLength(str: string, maxLength: number | undefined): string {
  if (maxLength !== undefined && str.length > maxLength) {
    return str.slice(0, maxLength) + '...';
  }
  return str;
}
