import {isExternalRef} from '@/schema/externalReferences.ts';

export function removeExternalReferences(schema: any): number {
  let externalRefsRemoved = 0;

  // recursively go over while schema and remove all external refs
  if (typeof schema === 'object' && schema !== null) {
    if (
      schema.$ref !== undefined &&
      typeof schema.$ref === 'string' &&
      isExternalRef(schema.$ref)
    ) {
      // remove external ref
      delete schema.$ref;
      externalRefsRemoved++;
    }
    // recursively check all properties of the schema
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        externalRefsRemoved += removeExternalReferences(schema[key]);
      }
    }
  }
  // handle arrays
  if (Array.isArray(schema)) {
    for (const item of schema) {
      externalRefsRemoved += removeExternalReferences(item);
    }
  }

  return externalRefsRemoved;
}
