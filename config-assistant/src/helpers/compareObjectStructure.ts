/**
 * Compares the structure of objects.
 * @param objects The objects to compare.
 * @returns True if the objects have the same structure, false otherwise.
 */
export function isObjectStructureEqual(...objects: any[]) {
  const objectKeys = objects.map(object => getAllKeysOfObject(object));
  const allKeys = objectKeys.reduce((allKeys, keys) => allKeys.concat(keys), []);

  const union = new Set(allKeys);
  return objects.every((object, index) => {
    return union.size === objectKeys[index].length;
  });
}

function getAllKeysOfObject(object: any, prefix = ''): string[] {
  const keys = Object.keys(object).map(key => prefix + key);
  for (const key of keys) {
    const value = object[key];
    if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeysOfObject(value, key + '.'));
    }
  }
  return keys;
}
