import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';

/**
 * Returns the schema if it is not a boolean.
 * Returns an empty object for `true` and `undefined` for `false`.
 */
export function nonBooleanSchema(schema: JsonSchemaType): JsonSchemaObjectType | undefined {
  if (schema === true) {
    return {};
  }
  if (schema === false) {
    return undefined;
  }
  return schema;
}
