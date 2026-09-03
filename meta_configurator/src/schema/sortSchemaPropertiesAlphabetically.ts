/**
 * Returns a new schema with every object's keys sorted alphabetically (recursively).
 * Arrays are walked but their order is preserved. The input is not mutated.
 */
export function sortSchemaPropertiesAlphabetically<T>(schema: T): T {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(item => sortSchemaPropertiesAlphabetically(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(schema).sort()) {
    result[key] = sortSchemaPropertiesAlphabetically((schema as Record<string, any>)[key]);
  }
  return result as T;
}
