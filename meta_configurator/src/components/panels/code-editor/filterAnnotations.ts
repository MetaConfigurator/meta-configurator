import type {ErrorObject} from 'ajv';

/**
 * Returns the input errors with composite parent-level errors (oneOf/anyOf/allOf/etc.)
 * removed when a more specific child error already exists for the same subtree.
 *
 * Each error has an "effective leaf path": for keywords that name a specific missing or
 * unexpected property (`required`, `additionalProperties`, `unevaluatedProperties`,
 * `dependentRequired`, `dependencies`, `propertyNames`) it's the instancePath extended
 * with that property name; for all other keywords it's just the instancePath.
 *
 * An error is dropped when its effective leaf path is a strict ancestor of another
 * error's effective leaf path. This keeps real per-property errors (e.g. "required
 * property 'name' is missing" at the root) while filtering out composite-keyword
 * summaries that point at the enclosing object/array.
 */
export function filterOutAncestorErrors(errors: ErrorObject[]): ErrorObject[] {
  const effectivePaths = errors.map(effectiveLeafPath);
  return errors.filter((_, i) => {
    const descendantPrefix = effectivePaths[i] + '/';
    return !effectivePaths.some(
      (other, j) => j !== i && other.startsWith(descendantPrefix)
    );
  });
}

function effectiveLeafPath(error: ErrorObject): string {
  const params = (error.params ?? {}) as Record<string, unknown>;
  const segment =
    (typeof params.missingProperty === 'string' && params.missingProperty) ||
    (typeof params.additionalProperty === 'string' && params.additionalProperty) ||
    (typeof params.unevaluatedProperty === 'string' && params.unevaluatedProperty) ||
    (typeof params.propertyName === 'string' && params.propertyName) ||
    undefined;
  if (segment === undefined) {
    return error.instancePath;
  }
  return error.instancePath + '/' + escapeJsonPointerSegment(segment);
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}
