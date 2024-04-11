import type {JsonSchemaType, SchemaPropertyType} from '@/model/jsonSchemaType';
import {JsonSchema} from '@/schema/jsonSchema';

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
export function schemaArray(
  schema: JsonSchemaType[] | undefined,
  referenceSchemaPreprocessed: JsonSchemaType
): JsonSchema[] {
  return schema?.map(s => new JsonSchema(s, referenceSchemaPreprocessed)) ?? [];
}

/**
 * Converts a record of schemas to a record of JsonSchema objects.
 */
export function schemaRecord(
  schemaRecord: Record<string, JsonSchemaType> | undefined,
  referenceSchemaPreprocessed: JsonSchemaType
): Record<string, JsonSchema> {
  return Object.fromEntries(
    Object.entries(schemaRecord ?? {}).map(([key, value]) => [
      key,
      new JsonSchema(value, referenceSchemaPreprocessed),
    ])
  );
}

/**
 * Creates a JsonSchema object from a JsonSchemaType.
 * In contrast to the JsonSchema constructor, this function also handles undefined values.
 */
export function schemaFromObject(
  jsonSchema: JsonSchemaType | undefined,
  referenceSchemaPreprocessed: JsonSchemaType
): JsonSchema | undefined {
  if (!jsonSchema) {
    return undefined;
  }
  return new JsonSchema(jsonSchema, referenceSchemaPreprocessed);
}

/**
 * Converts a type string into a JSON schema that only has a
 * type constraint with the given type, i.e.,
 * `{type: t}` for the given type `t`.
 */
export function typeSchema(
  type: SchemaPropertyType,
  referenceSchemaPreprocessed: JsonSchemaType
): JsonSchema {
  return new JsonSchema({type}, referenceSchemaPreprocessed, false);
}
