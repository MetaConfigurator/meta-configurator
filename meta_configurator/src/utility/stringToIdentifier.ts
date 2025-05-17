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
