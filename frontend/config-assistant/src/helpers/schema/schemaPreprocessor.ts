import type {JsonSchemaType} from '@/model/JsonSchemaType';
import pointer from 'json-pointer';
import {useSessionStore} from '@/store/sessionStore';
import {nonBooleanSchema} from '@/helpers/schema/SchemaUtils';
import {
  areSchemasCompatible,
  mergeAllOfs,
  mergeSchemas,
  safeMergeAllOfs,
  safeMergeSchemas,
} from '@/helpers/schema/mergeAllOfs';

const preprocessedRefSchemas: Map<string, JsonSchemaType> = new Map();

/**
 * Preprocesses the schema:
 * - Resolves references (lazy resolver)
 * - Merges all-ofs
 * - Converts list of types to oneOfs
 * - Removes oneOfs and anyOfs not compatible with schema
 * - Merges back oneOfs and anyOfs with just one single entry into the schema
 * - If it is possible: merges oneOfs into anyOfs
 *
 * @param schema2 the schema to preprocess
 * @returns the preprocessed schema
 */
export function preprocessSchema(schema2: JsonSchemaType): JsonSchemaType {
  if (typeof schema2 !== 'object') {
    return schema2;
  }
  let schema: JsonSchemaType = {...schema2};
  // console.groupCollapsed('preprocessSchema', schema.title ?? schema.$id ?? schema.id ?? schema);
  console.trace();

  console.log('schema', schema);
  if (hasRef(schema)) {
    schema = resolveReference(schema);
    console.log('schema after resolving reference', schema);
  }

  console.log('schema before handling allOfs', schema);
  schema = handleAllOfs(schema);
  console.log('schema after handling allOfs', schema);
  convertTypesToOneOf(schema);
  console.log('schema after converting types to oneOfs', schema);
  removeIncompatibleOneOfs(schema);
  console.log('schema after removing incompatible oneOfs', schema);
  removeIncompatibleAnyOfs(schema);
  console.log('schema after removing incompatible anyOfs', schema);
  schema = mergeSingularOneOf(schema);
  console.log('schema after merging singular oneOf', schema);
  schema = mergeSingularAnyOf(schema);
  console.log('schema after merging singular anyOf', schema);
  attemptMergeOneOfsIntoAnyOfs(schema);
  console.log('schema after attempting to merge oneOfs into anyOfs', schema);
  preprocessOneOfs(schema);
  console.log('schema after preprocessing oneOfs', schema);
  preprocessAnyOfs(schema);
  console.log('schema after preprocessing anyOfs', schema);
  // TODO: deal with case where there is anyOf and oneOf --> show both options in GUI?

  // console.groupEnd();
  return schema;
}

function hasRef(schema: JsonSchemaType): boolean {
  if (typeof schema !== 'object') {
    return false;
  }
  return schema.$ref !== undefined;
}

function handleAllOfs(schema: JsonSchemaType) {
  if (hasAllOfs(schema)) {
    // @ts-ignore
    schema.allOf = schema.allOf!!.map(subSchema => preprocessSchema(subSchema));
    console.log('schema after preprocessing allOfs', schema);

    schema = extractIfsOfAllOfs(schema);
    console.log('schema after extracting ifs of allOfs', schema);
    schema = mergeAllOfs(schema);
  }
  return schema;
}

function convertTypesToOneOf(schema: JsonSchemaType) {
  if (typeof schema !== 'object') {
    return;
  }

  if (!Array.isArray(schema.type)) {
    return;
  }

  if (schema.type.length == 1) {
    schema.type = schema.type[0];
    return;
  }

  // easier scenario: no oneOfs
  if (!hasOneOfs(schema) && schema.type.length > 1) {
    const newOneOfs: JsonSchemaType[] = [];

    schema.type.forEach(propertyType => {
      const typeSchema = {
        type: propertyType,
      };

      newOneOfs.push(typeSchema);
    });

    schema.oneOf = newOneOfs;
    delete schema.type;
  } else {
    // more difficult scenario: oneOfs exist. Multiply original oneOfs with types
    const newOneOfs: JsonSchemaType[] = [];
    schema.type.forEach(propertyType => {
      const typeSchema = {
        type: propertyType,
      };

      schema.oneOf!.forEach((originalOneOf: JsonSchemaType) => {
        const combinedSchema = {
          allOf: [typeSchema, preprocessSchema(originalOneOf)],
        };
        const newOneOf = safeMergeAllOfs(combinedSchema);
        newOneOfs.push(newOneOf);
      });
    });
    schema.oneOf = newOneOfs;
    delete schema.type;
  }
}

function extractIfsOfAllOfs(schema: JsonSchemaType): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }
  console.log('extractIfsOfAllOfs', schema);
  if (!schema.allOf) {
    console.log('no allOfs', schema);
    return schema;
  }
  const conditions: JsonSchemaType[] = [];
  schema.allOf.forEach(allOf => {
    if (typeof allOf == 'object' && allOf.if) {
      const newIf = preprocessSchema(allOf.if);
      let newThen: JsonSchemaType | undefined;
      let newElse: JsonSchemaType | undefined;
      if (allOf.then) {
        newThen = preprocessSchema(allOf.then);
      }
      if (allOf.else) {
        newElse = preprocessSchema(allOf.else);
      }
      conditions.push({
        if: newIf,
        then: newThen,
        else: newElse,
        $id: schema.$id + '/condition' + conditions.length,
      });
      delete allOf.if;
      delete allOf.then;
      delete allOf.else;
    }
  });
  if (conditions.length == 0) {
    console.log('no conditions', schema);
    return schema;
  }
  console.log('conditions', conditions);
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

    for (let i = 0; i < schema.anyOf!!.length; i++) {
      const subSchemaAnyOf = schema.anyOf!![i];

      const mergedOneOfs: JsonSchemaType[] = [];

      schema.oneOf!!.forEach(subSchemaOneOf => {
        const mergeResult = safeMergeSchemas(subSchemaAnyOf, subSchemaOneOf);
        if (mergeResult != false) {
          mergedOneOfs.push(mergeResult);
        }
      });

      if (mergedOneOfs.length == 1) {
        // if anyOf has just one compatible oneOf: merge it
        schema.anyOf!![i] = mergedOneOfs[0];
      } else if (mergedOneOfs.length > 1) {
        someAnyOfHasMultipleOneOfOptions = true;
      }
    }

    if (!someAnyOfHasMultipleOneOfOptions) {
      delete schema.oneOf;
    }
  }
}

function preprocessAnyOfs(schema: JsonSchemaType) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasAnyOfs(schema)) {
    schema.anyOf = schema.anyOf?.map(subSchema => {
      return preprocessSchema(subSchema);
    });
  }
}

function preprocessOneOfs(schema: JsonSchemaType) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasOneOfs(schema)) {
    schema.oneOf = schema.oneOf?.map(subSchema => {
      return preprocessSchema(subSchema);
    });
  }
}

function removeIncompatibleAnyOfs(schema: JsonSchemaType) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasAnyOfs(schema)) {
    // console.groupCollapsed('removeIncompatibleAnyOfs')
    // console.log('schema.anyOf before', schema.anyOf);
    // @ts-ignore
    schema.anyOf = schema.anyOf!!.map(subSchema => {
      const copiedSchemaWithoutAnyOf = {...schema};
      delete copiedSchemaWithoutAnyOf.anyOf;
      if (!areSchemasCompatible(copiedSchemaWithoutAnyOf, subSchema)) {
        return false;
      } else {
        return subSchema;
      }
    });
    // remove oneOfs that are not compatible with parent
    schema.anyOf = schema.anyOf.filter(anyOf => anyOf != false);
    // console.log('schema.anyOf after', schema.anyOf)
    // console.groupEnd();
  }
}

function removeIncompatibleOneOfs(schema: JsonSchemaType) {
  if (typeof schema !== 'object') {
    return;
  }
  if (hasOneOfs(schema)) {
    console.log('schema.oneOf before', schema.oneOf);
    schema.oneOf = schema.oneOf!.map(subSchema => {
      const copiedSchemaWithoutOneOf = {...schema};
      delete copiedSchemaWithoutOneOf.oneOf;
      if (!areSchemasCompatible(copiedSchemaWithoutOneOf, subSchema)) {
        return false;
      } else {
        return subSchema;
      }
    });
    console.log('schema.oneOf after', schema.oneOf);
    // remove oneOfs that are not compatible with parent
    schema.oneOf = schema.oneOf.filter(oneOf => oneOf != false);
    console.log('schema.oneOf after filtering', schema.oneOf);
  }
}

// if oneOf has just one entry: merge into parent
function mergeSingularOneOf(schema: JsonSchemaType): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }
  if (hasOneOfs(schema)) {
    if (schema.oneOf!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.oneOf;
      return mergeSchemas(preprocessSchema(schema.oneOf![0]), preprocessSchema(copiedSchema));
    } else if (schema.oneOf!!.length == 0) {
      throw Error('oneOf array has zero entries for schema ' + JSON.stringify(schema));
    }
  }

  return schema;
}

// if anyOf has just one entry: merge into parent
function mergeSingularAnyOf(schema: JsonSchemaType): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }

  if (hasAnyOfs(schema)) {
    if (schema.anyOf!!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.anyOf;
      return mergeSchemas(preprocessSchema(schema.anyOf!![0]), preprocessSchema(copiedSchema));
    } else if (schema.anyOf!!.length == 0) {
      throw Error('anyOf array has zero entries for schema ' + JSON.stringify(schema));
    }
  }

  return schema;
}

function resolveReference(schema: JsonSchemaType): JsonSchemaType {
  if (typeof schema !== 'object') {
    return schema;
  }
  // remove leading # from ref if present
  const refString = schema.$ref?.startsWith('#') ? schema.$ref.substring(1) : schema.$ref!!;

  let refSchema: any;
  if (preprocessedRefSchemas.has(refString)) {
    refSchema = preprocessedRefSchemas.get(refString);
  } else {
    console.log('refString', refString);
    console.log('useSessionStore().fileSchemaData', useSessionStore().fileSchemaDataPreprocessed);
    refSchema = pointer.get(
      nonBooleanSchema(useSessionStore().fileSchemaDataPreprocessed ?? {}) ?? {},
      refString
    );
    console.log('refSchema', refSchema);
    refSchema = preprocessSchema(refSchema);
    console.log('refSchema after preprocessing', refSchema);
    preprocessedRefSchemas.set(refString, refSchema);
  }

  const schemaWithoutRef = {...schema};
  delete schemaWithoutRef.$ref;
  return {
    allOf: [refSchema, schemaWithoutRef],
  };
}

function hasAllOfs(schema: JsonSchemaType): boolean {
  if (typeof schema !== 'object') {
    return false;
  }
  return schema.allOf !== undefined && schema.allOf.length > 0;
}

function hasOneOfs(schema: JsonSchemaType): boolean {
  if (typeof schema !== 'object') {
    return false;
  }
  return schema.oneOf !== undefined && schema.oneOf.length > 0;
}

function hasAnyOfs(schema: JsonSchemaType): boolean {
  if (typeof schema !== 'object') {
    return false;
  }
  return schema.anyOf !== undefined && schema.anyOf.length > 0;
}
