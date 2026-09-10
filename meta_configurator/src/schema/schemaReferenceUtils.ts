import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import type {Path} from '@/utility/path';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';
import {dataAt} from '@/utility/resolveDataAtPath';
import {JsonSchemaVisitor} from '@/schema/jsonSchemaVisitor';

export function resolveInternalReferencePath(reference: string): Path | undefined {
  if (!reference.startsWith('#')) {
    return undefined;
  }
  return jsonPointerToPathTyped(reference);
}

class CollectRefsVisitor extends JsonSchemaVisitor {
  readonly refs = new Set<string>();

  protected visitRef(ref: string): void {
    this.refs.add(ref);
  }
}

/**
 * Collects all reference values ($ref, $dynamicRef, $recursiveRef) found anywhere
 * in the given schema. Returns each reference only once, in traversal order.
 */
export function collectAllRefs(schema: JsonSchemaType): string[] {
  const visitor = new CollectRefsVisitor(false);
  visitor.traverse(schema);
  return Array.from(visitor.refs);
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
