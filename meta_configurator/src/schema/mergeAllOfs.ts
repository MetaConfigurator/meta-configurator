import type {JsonSchemaType} from '@/schema/jsonSchemaType';
// @ts-ignore
import mergeAllOf from 'json-schema-merge-allof';

export function mergeAllOfs(schema: JsonSchemaType, deep: boolean = true): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }

  try {
    return mergeAllOfWithResolvers(schema, deep);
  } catch (error) {
    return mergeAllOfWithResolvers(stripNonValidationFields(schema), deep);
  }
}

function mergeAllOfWithResolvers(schema: JsonSchemaType, deep: boolean): JsonSchemaType {
  return mergeAllOf(
    schema as any,
    {
      deep: deep,
      resolvers: {
        defaultResolver: mergeAllOf.options.resolvers.title,
        // add additional resolvers here, most of the keywords are NOT supported by default
        conditions: function (values: any[][]) {
          return values.flat(); // just merge all conditions
        },
        metaConfigurator: function (values: any[][]) {
          let result = {
            advanced: false,
            hideAddPropertyButton: false,
          };
          for (const value of values) {
            if ('advanced' in value && value.advanced) {
              result.advanced = true;
            }
            if ('hideAddPropertyButton' in value && value.hideAddPropertyButton) {
              result.hideAddPropertyButton = true;
            }
          }
          return result;
        },
      },
    } as any
  );
}
export function safeMergeAllOfs(schema: JsonSchemaType, deep: boolean = true): JsonSchemaType {
  try {
    return mergeAllOfs(schema, deep);
  } catch (e) {
    return false;
  }
}

export function areSchemasCompatible(...schemas: JsonSchemaType[]): boolean {
  const strippedSchemas = schemas.map(schema => stripNonValidationFields(schema));

  if (strippedSchemas.some(schema => schema === false)) {
    return false;
  }

  // empty-object schemas are neutral: they impose no constraints, so they're
  // always compatible with anything. Drop them before delegating to the merger.
  const relevantSchemas = strippedSchemas.filter(
    schema =>
      !(
        typeof schema === 'object' &&
        schema !== null &&
        !Array.isArray(schema) &&
        Object.keys(schema).length === 0
      )
  );

  if (relevantSchemas.length === 0) {
    return true;
  }

  // Even a single remaining schema must be checked: a top-level allOf that the
  // merger can't reconcile (e.g. multiple `contains` with disjoint enums after
  // const -> enum normalization) is a genuine incompatibility that must propagate
  // up so the caller can drop the option. Use a shallow merge so unrelated
  // nested allOfs (which will be resolved when their own subtree is processed)
  // don't cause false negatives here.
  const combined = {allOf: relevantSchemas};
  return safeMergeAllOfs(combined, false) !== false;
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

function stripNonValidationFields(schema: JsonSchemaType): JsonSchemaType {
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(item => stripNonValidationFields(item));
  }

  const stripped: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (NON_VALIDATION_FIELDS.has(key)) {
      continue;
    }
    stripped[key] = stripNonValidationFields(value as JsonSchemaType);
  }
  return stripped;
}

const NON_VALIDATION_FIELDS = new Set([
  'title',
  'description',
  '$comment',
  'default',
  'examples',
  'deprecated',
  'readOnly',
  'writeOnly',
  'metaConfigurator',
  '$id',
  '$schema',
  'id',
]);
