import type {JsonSchemaType} from '@/schema/jsonSchemaType';
// @ts-ignore
import mergeAllOf from 'json-schema-merge-allof';

export function mergeAllOfs(schema: JsonSchemaType): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }

  return mergeAllOf(schema, {
    deep: true,
    resolvers: {
      defaultResolver: mergeAllOf.options.resolvers.title,
      // add additional resolvers here, most of the keywords are NOT supported by default
      conditions: function (values: any[][]) {
        return values.flat(); // just merge all conditions
      },
    },
  });
}
export function safeMergeAllOfs(schema: JsonSchemaType): JsonSchemaType {
  try {
    return mergeAllOfs(schema);
  } catch (e) {
    return false;
  }
}

export function areSchemasCompatible(...schemas: JsonSchemaType[]): boolean {
  const mergeResult = safeMergeSchemas(...schemas);
  return mergeResult != false;
}

export function safeMergeSchemas(...schemas: JsonSchemaType[]): JsonSchemaType | false {
  const combinedSchema = {
    allOf: [...schemas],
  };
  return safeMergeAllOfs(combinedSchema);
}

export function mergeSchemas(...schemas: JsonSchemaType[]): JsonSchemaType {
  const combinedSchema = {
    allOf: [...schemas],
  };
  return mergeAllOfs(combinedSchema);
}
