import type {JsonSchemaType} from '@/schema/model/JsonSchemaType';
import {JsonSchema} from '@/schema/model/JsonSchema';

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

export function schemaArray(schema?: JsonSchemaType[]): JsonSchema[] {
  return schema?.map(s => new JsonSchema(s)) ?? [];
}

export function schemaRecord(schema?: Record<string, JsonSchemaType>): Record<string, JsonSchema> {
  return Object.fromEntries(
    Object.entries(schema ?? {}).map(([key, value]) => [key, new JsonSchema(value)])
  );
}

export function schemaFromObject(jsonSchema?: JsonSchemaType): JsonSchema | undefined {
  if (!jsonSchema) {
    return undefined;
  }
  return new JsonSchema(jsonSchema);
}
