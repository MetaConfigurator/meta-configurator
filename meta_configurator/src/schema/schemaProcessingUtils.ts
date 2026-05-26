import type {
  JsonSchemaObjectType,
  JsonSchemaType,
  SchemaPropertyType,
} from '@/schema/jsonSchemaType';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {nonBooleanSchema} from '@/schema/schemaTypeUtils';
import type {SessionMode} from '@/store/sessionMode';

/**
 * Coverts an array of schemas to an array of JsonSchema objects.
 */
export function schemaArray(
  schema: JsonSchemaType[] | undefined,
  mode: SessionMode
): JsonSchemaWrapper[] {
  return schema?.map(s => new JsonSchemaWrapper(s, mode)) ?? [];
}

/**
 * Converts a record of schemas to a record of JsonSchema objects.
 */
export function schemaRecord(
  schemaRecord: Record<string, JsonSchemaType> | undefined,
  mode: SessionMode
): Record<string, JsonSchemaWrapper> {
  return Object.fromEntries(
    Object.entries(schemaRecord ?? {}).map(([key, value]) => [
      key,
      new JsonSchemaWrapper(value, mode),
    ])
  );
}

/**
 * Creates a JsonSchema object from a JsonSchemaType.
 * In contrast to the JsonSchema constructor, this function also handles undefined values.
 */
export function schemaFromObject(
  jsonSchema: JsonSchemaType | undefined,
  mode: SessionMode
): JsonSchemaWrapper | undefined {
  if (!jsonSchema) {
    return undefined;
  }
  return new JsonSchemaWrapper(jsonSchema, mode);
}

/**
 * Converts a type string into a JSON schema that only has a
 * type constraint with the given type, i.e.,
 * `{type: t}` for the given type `t`.
 */
export function typeSchema(type: SchemaPropertyType, mode: SessionMode): JsonSchemaWrapper {
  return new JsonSchemaWrapper({type}, mode, false);
}
