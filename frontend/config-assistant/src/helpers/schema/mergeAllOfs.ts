import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
// @ts-ignore
import mergeAllOf from 'json-schema-merge-allof';

export function mergeAllOfs(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  schema = extractIfsOfAllOfs(schema);
  const result = mergeAllOf(schema, {
    deep: true,
    resolvers: {
      defaultResolver: mergeAllOf.options.resolvers.title,
      // add additional resolvers here, most of the keywords are NOT supported by default
      conditions: function (values: any[][]) {
        return values.flat();
      },
    },
  });
  return result;
}

function extractIfsOfAllOfs(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  const conditions: JsonSchemaObjectType[] = [];
  if (!schema.allOf) {
    return schema;
  }
  schema.allOf.forEach(allOf => {
    if (typeof allOf == 'object' && allOf.if) {
      conditions.push({if: allOf.if, then: allOf.then, else: allOf.else});
      delete allOf.if;
      delete allOf.then;
      delete allOf.else;
    }
  });
  if (conditions.length == 0) {
    return schema;
  }
  return {...schema, conditions};
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
