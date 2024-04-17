import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import pointer from 'json-pointer';
import {nonBooleanSchema} from '@/schema/schemaUtils';
import {
  areSchemasCompatible,
  mergeAllOfs,
  mergeSchemas,
  safeMergeSchemas,
} from '@/schema/mergeAllOfs';
import {SessionMode} from '@/store/sessionMode';
import {getSchemaForMode} from '@/data/useDataLink';

const preprocessedRefSchemasMap: Map<SessionMode, Map<string, JsonSchemaType>> = new Map(
  Object.values(SessionMode).map(mode => [mode, new Map()])
);

/**
 * Resolves and transforms the schema:
 * - Resolves references (lazy resolver)
 * - Merges all-ofs
 * - Converts list of types to oneOfs
 * - Removes oneOfs and anyOfs not compatible with schema
 * - Merges back oneOfs and anyOfs with just one single entry into the schema
 * - If it is possible: merges oneOfs into anyOfs
 *
 * @param schema the schema to preprocess
 * @param rootSchema used for resolving references
 * @returns the preprocessed schema
 */
export function resolveAndTransform(schema: JsonSchemaType, mode: SessionMode): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }
  let schemaCopy: JsonSchemaType = {...schema};

  if (hasRef(schemaCopy)) {
    schemaCopy = resolveReference(schemaCopy, mode);
  }

  schemaCopy = handleAllOfs(schemaCopy, mode);
  removeIncompatibleOneOfs(schemaCopy);
  removeIncompatibleAnyOfs(schemaCopy);
  schemaCopy = mergeSingularOneOf(schemaCopy, mode);
  schemaCopy = mergeSingularAnyOf(schemaCopy, mode);
  attemptMergeOneOfsIntoAnyOfs(schemaCopy);
  preprocessOneOfs(schemaCopy, mode);
  preprocessAnyOfs(schemaCopy, mode);
  // TODO: deal with case where there is anyOf and oneOf --> show both options in GUI?

  return schemaCopy;
}

function hasRef(schema: JsonSchemaType): schema is {$ref: string} & JsonSchemaObjectType {
  if (typeof schema !== 'object') {
    return false;
  }
  return schema.$ref !== undefined;
}

function handleAllOfs(schema: JsonSchemaType, mode: SessionMode) {
  if (typeof schema !== 'object') {
    return schema;
  }

  if (hasAllOfs(schema)) {
    schema.allOf = schema.allOf!.map(subSchema => resolveAndTransform(subSchema, mode));

    schema = extractIfsOfAllOfs(schema, mode);
    schema = mergeAllOfs(schema);
  }
  return schema;
}

function extractIfsOfAllOfs(schema: JsonSchemaType, mode: SessionMode): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }
  if (!schema.allOf) {
    return schema;
  }
  const conditions: JsonSchemaType[] = [];
  schema.allOf.forEach(allOf => {
    if (typeof allOf == 'object' && allOf.if) {
      const newIf = resolveAndTransform(allOf.if, mode);
      let newThen: JsonSchemaType | undefined;
      let newElse: JsonSchemaType | undefined;
      if (allOf.then) {
        newThen = resolveAndTransform(allOf.then, mode);
      }
      if (allOf.else) {
        newElse = resolveAndTransform(allOf.else, mode);
      }
      conditions.push({
        if: newIf,
        then: newThen,
        else: newElse,
      });
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

// It can happen that a schema has both oneOfs and anyOfs.
// When this is the case, the user will have to manually select both a
// oneOf sub-schema, and a set of anyOf sub-schemata.
// Sometimes, the oneOf choice is implicitly given by making an anyOf selection.
// This function will merge all oneOfs into anyOfs, where those oneOfs are
// the only oneOf choice for the given anyOf.
// If for every anyOf only one oneOf is possible, the oneOf property is
// removed from the schema altogether.
function attemptMergeOneOfsIntoAnyOfs(schema: JsonSchemaType) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasAnyOfs(schema) && hasOneOfs(schema)) {
    let someAnyOfHasMultipleOneOfOptions = false;

    for (let i = 0; i < schema.anyOf.length; i++) {
      const subSchemaAnyOf = schema.anyOf[i];

      const mergedOneOfs: JsonSchemaType[] = [];

      schema.oneOf.forEach(subSchemaOneOf => {
        const mergeResult = safeMergeSchemas(subSchemaAnyOf, subSchemaOneOf);
        if (mergeResult != false) {
          mergedOneOfs.push(mergeResult);
        }
      });

      if (mergedOneOfs.length == 1) {
        // if anyOf has just one compatible oneOf: merge it
        schema.anyOf[i] = mergedOneOfs[0];
      } else if (mergedOneOfs.length > 1) {
        someAnyOfHasMultipleOneOfOptions = true;
      }
    }

    if (!someAnyOfHasMultipleOneOfOptions) {
      schema = schema as JsonSchemaObjectType; // cast necessary to mark oneOf as optional
      delete schema.oneOf;
    }
  }
}

function preprocessAnyOfs(schema: JsonSchemaType, mode: SessionMode) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasAnyOfs(schema)) {
    schema.anyOf = schema.anyOf?.map(subSchema => {
      return resolveAndTransform(subSchema, mode);
    });
  }
}

function preprocessOneOfs(schema: JsonSchemaType, mode: SessionMode) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasOneOfs(schema)) {
    schema.oneOf = schema.oneOf?.map(subSchema => {
      return resolveAndTransform(subSchema, mode);
    });
  }
}

function removeIncompatibleAnyOfs(schema: JsonSchemaType) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasAnyOfs(schema)) {
    schema.anyOf = schema.anyOf.map(subSchema => {
      const copiedSchemaWithoutAnyOf: JsonSchemaObjectType = {...schema};
      delete copiedSchemaWithoutAnyOf.anyOf;
      if (!areSchemasCompatible(copiedSchemaWithoutAnyOf, subSchema)) {
        return false;
      } else {
        return subSchema;
      }
    });
    // remove oneOfs that are not compatible with parent
    schema.anyOf = schema.anyOf.filter(anyOf => anyOf != false);
  }
}

function removeIncompatibleOneOfs(schema: JsonSchemaType) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasOneOfs(schema)) {
    schema.oneOf = schema.oneOf!.map(subSchema => {
      const copiedSchemaWithoutOneOf: JsonSchemaObjectType = {...schema};
      delete copiedSchemaWithoutOneOf.oneOf;
      if (!areSchemasCompatible(copiedSchemaWithoutOneOf, subSchema)) {
        return false;
      } else {
        return subSchema;
      }
    });
    // remove oneOfs that are not compatible with parent
    schema.oneOf = schema.oneOf.filter(oneOf => oneOf != false);
  }
}

// if oneOf has just one entry: merge into parent
function mergeSingularOneOf(schema: JsonSchemaType, mode: SessionMode): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }
  if (hasOneOfs(schema)) {
    if (schema.oneOf.length == 1) {
      const copiedSchema: JsonSchemaObjectType = {...schema};
      delete copiedSchema.oneOf;
      return mergeSchemas(
        resolveAndTransform(schema.oneOf![0], mode),
        resolveAndTransform(copiedSchema, mode)
      );
    } else if (schema.oneOf!!.length == 0) {
      throw Error('oneOf array has zero entries for schema ' + JSON.stringify(schema));
    }
  }

  return schema;
}

// if anyOf has just one entry: merge into parent
function mergeSingularAnyOf(schema: JsonSchemaType, mode: SessionMode): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }

  if (hasAnyOfs(schema)) {
    if (schema.anyOf.length == 1) {
      const copiedSchema: JsonSchemaObjectType = {...schema};
      delete copiedSchema.anyOf;
      return mergeSchemas(
        resolveAndTransform(schema.anyOf!![0], mode),
        resolveAndTransform(copiedSchema, mode)
      );
    } else if (schema.anyOf!!.length == 0) {
      throw Error('anyOf array has zero entries for schema ' + JSON.stringify(schema));
    }
  }

  return schema;
}

function resolveReference(
  schema: {$ref: string} & JsonSchemaObjectType,
  mode: SessionMode
): JsonSchemaType {
  // remove leading # from ref if present
  const refString = schema.$ref.startsWith('#') ? schema.$ref.substring(1) : schema.$ref;

  let preprocessedRefSchemas = preprocessedRefSchemasMap.get(mode)!;
  let refSchema: any;
  if (preprocessedRefSchemas.has(refString)) {
    refSchema = preprocessedRefSchemas.get(refString);
  } else {
    let rootSchema = getSchemaForMode(mode).schemaPreprocessed.value;
    try {
      refSchema = pointer.get(nonBooleanSchema(rootSchema ?? {}) ?? {}, refString);
    } catch (e) {
      throw e;
      refSchema = {};
    }
    refSchema = resolveAndTransform(refSchema, mode);
    preprocessedRefSchemas.set(refString, refSchema);
  }

  const schemaWithoutRef: JsonSchemaObjectType = {...schema};
  delete schemaWithoutRef.$ref;
  return {
    allOf: [refSchema, schemaWithoutRef],
  };
}

function hasAllOfs(
  schema: JsonSchemaType
): schema is {allOf: JsonSchemaType[]} & JsonSchemaObjectType {
  if (typeof schema !== 'object') {
    return false;
  }
  return schema.allOf !== undefined && schema.allOf.length > 0;
}

function hasOneOfs(
  schema: JsonSchemaType
): schema is {oneOf: JsonSchemaType[]} & JsonSchemaObjectType {
  if (typeof schema !== 'object') {
    return false;
  }
  return schema.oneOf !== undefined && schema.oneOf.length > 0;
}

function hasAnyOfs(
  schema: JsonSchemaType
): schema is {anyOf: JsonSchemaType[]} & JsonSchemaObjectType {
  if (typeof schema !== 'object') {
    return false;
  }
  return schema.anyOf !== undefined && schema.anyOf.length > 0;
}

/**
 * Clears the cache of preprocessed schemas.
 */
export function clearPreprocessedRefSchemaCache() {
  for (let preprocessedSchemas of preprocessedRefSchemasMap.values()) {
    preprocessedSchemas.clear();
  }
}
