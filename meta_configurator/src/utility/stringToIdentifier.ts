export function stringToIdentifier(input: string, cutExtension: boolean = false): string {
  if (cutExtension) {
    input = input.replace(/\.[^/.]+$/, '');
  }

  // remove special characters, trim whitespaces outside and replace whitespaces inside with underscores. Also transform to lower case.
  return input
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s/g, '_')
    .toLowerCase();
}


export function urlStringToIdentifier(input: string): string {
  // leave only last part of URL and then apply stringToIdentifier
  try {
    const url = new URL(input);
    const lastPart = url.pathname.split('/').filter(part => part.length > 0).pop() || '';
    return stringToIdentifier(lastPart, true);
  } catch {
    // if input is not a valid URL, just apply stringToIdentifier to the whole input
    return stringToIdentifier(input, true);
  }
}