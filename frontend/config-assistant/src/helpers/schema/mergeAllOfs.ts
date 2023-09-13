import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
// @ts-ignore
import mergeAllOf from 'json-schema-merge-allof';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';

export function mergeAllOfs(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  return mergeAllOf(schema, {
    deep: false,
    resolvers: {
      defaultResolver: mergeAllOf.options.resolvers.title,
      // add additional resolvers here, most of the keywords are NOT supported by default
    },
  });
}

export function safeMergeAllOfs(schema: JsonSchemaObjectType): JsonSchemaObjectType | false {
  try {
    return mergeAllOfs(schema);
  } catch (e) {
    return false;
  }
}

export function areSchemasCompatible(...schemas: JsonSchemaObjectType[]): boolean {
  const mergeResult = safeMergeSchemas(...schemas);
  return mergeResult != false;
}

export function safeMergeSchemas(...schemas: JsonSchemaObjectType[]): JsonSchemaObjectType | false {
  const combinedSchema = {
    allOf: [...schemas],
  };
  return safeMergeAllOfs(combinedSchema as JsonSchemaObjectType);
}

export function mergeSchemas(...schemas: JsonSchemaObjectType[]): JsonSchemaObjectType {
  const combinedSchema = {
    allOf: [...schemas],
  };
  return mergeAllOfs(combinedSchema as JsonSchemaObjectType);
}
