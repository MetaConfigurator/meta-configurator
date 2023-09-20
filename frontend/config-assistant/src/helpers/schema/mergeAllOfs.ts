import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
// @ts-ignore
import mergeAllOf from 'json-schema-merge-allof';
import {debuggingService} from '@/helpers/debuggingService';
import {isNumber} from 'lodash';

export function mergeAllOfs(schema: JsonSchemaObjectType, depth: number): JsonSchemaObjectType {
  const result = mergeAllOf(schema, {
    deep: false,
    resolvers: {
      defaultResolver: mergeAllOf.options.resolvers.title,
      // add additional resolvers here, most of the keywords are NOT supported by default
    },
  });
  debuggingService.addPreprocessingStep(depth, 'mergeAllOfs', result);
  return result;
}

export function safeMergeAllOfs(
  schema: JsonSchemaObjectType,
  depth: number
): JsonSchemaObjectType | false {
  try {
    return mergeAllOfs(schema, depth);
  } catch (e) {
    return false;
  }
}

export function areSchemasCompatible(...schemas: JsonSchemaObjectType[], depth: number): boolean {
  const mergeResult = safeMergeSchemas(...schemas, depth);
  return mergeResult != false;
}

export function safeMergeSchemas(
  ...schemas: JsonSchemaObjectType[],
  depth: number
): JsonSchemaObjectType | false {
  const combinedSchema = {
    allOf: [...schemas],
  };
  return safeMergeAllOfs(combinedSchema as JsonSchemaObjectType, depth);
}

export function mergeSchemas(
  ...schemas: JsonSchemaObjectType[],
  depth: number
): JsonSchemaObjectType {
  const combinedSchema = {
    allOf: [...schemas],
  };
  return mergeAllOfs(combinedSchema as JsonSchemaObjectType, depth);
}
