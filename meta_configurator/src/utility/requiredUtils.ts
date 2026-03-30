/**
 * Returns a new array with the given name removed from the required props list.
 * Returns the original array unchanged if the name is not present.
 */
export function removeFromRequiredArray(requiredProps: string[], nameToRemove: string): string[] {
  const index = requiredProps.indexOf(nameToRemove);
  if (index === -1) return requiredProps;
  return requiredProps.filter((_, i) => i !== index);
}
