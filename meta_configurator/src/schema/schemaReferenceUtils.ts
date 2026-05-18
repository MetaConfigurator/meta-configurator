import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import type {Path} from '@/utility/path';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';
import {dataAt} from '@/utility/resolveDataAtPath';

export function resolveInternalReferencePath(reference: string): Path | undefined {
  if (!reference.startsWith('#')) {
    return undefined;
  }
  return jsonPointerToPathTyped(reference);
}

export function resolveInternalReferenceSchema(
  reference: string,
  rootSchema: JsonSchemaType
): JsonSchemaObjectType | undefined {
  const referencePath = resolveInternalReferencePath(reference);
  if (!referencePath) {
    return undefined;
  }

  const referencedSchema = dataAt(referencePath, rootSchema);
  if (
    referencedSchema === undefined ||
    typeof referencedSchema !== 'object' ||
    referencedSchema === null
  ) {
    return undefined;
  }

  return referencedSchema as JsonSchemaObjectType;
}
