import type {JsonSchemaType} from '@/model/JsonSchemaType';
import {JsonSchema} from '@/schema/JsonSchema';

/**
 * @returns the schema if it is not a boolean, otherwise
 * returns an empty object if the schema is true, or undefined if the schema is false
 */
export function nonBooleanSchema(schema: JsonSchemaType) {
  if (schema === true) {
    return {};
  }
  if (schema === false) {
    return undefined;
  }
  return schema;
}

/**
 * Coverts an array of schemas to an array of JsonSchema objects.
 */
export function schemaArray(schema?: JsonSchemaType[]): JsonSchema[] {
  return schema?.map(s => new JsonSchema(s)) ?? [];
}

/**
 * Converts a record of schemas to a record of JsonSchema objects.
 */
export function schemaRecord(
  schemaRecord?: Record<string, JsonSchemaType>
): Record<string, JsonSchema> {
  return Object.fromEntries(
    Object.entries(schemaRecord ?? {}).map(([key, value]) => [key, new JsonSchema(value)])
  );
}

/**
 * Creates a JsonSchema object from a JsonSchemaType.
 * In contrast to the JsonSchema constructor, this function also handles undefined values.
 */
export function schemaFromObject(jsonSchema?: JsonSchemaType): JsonSchema | undefined {
  if (!jsonSchema) {
    return undefined;
  }
  return new JsonSchema(jsonSchema);
}
