import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
// @ts-ignore
import mergeAllOf from 'json-schema-merge-allof';
import {debuggingService} from '@/helpers/debuggingService';

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
