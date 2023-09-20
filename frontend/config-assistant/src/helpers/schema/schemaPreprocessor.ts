import type {
  JsonSchemaObjectType,
  JsonSchemaType,
  SchemaPropertyType,
} from '@/model/JsonSchemaType';
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
import _ from 'lodash';
import {debuggingService} from '@/helpers/debuggingService';

const preprocessedRefSchemas: Map<string, JsonSchemaObjectType> = new Map();

/**
 * Preprocesses the schema:
 * - Resolves references (lazy resolver)
 * - Merges all-ofs
 * - Converts list of types to oneOfs
 * - Removes oneOfs and anyOfs not compatible with schema
 * - Merges back oneOfs and anyOfs with just one single entry into the schema
 * - If it is possible: merges oneOfs into anyOfs
 * - Induces title for schema if it does not have title defined
 * - Converts const to enum
 * - Injects types of enum to types property
 *
 * @param schema the schema to preprocess
 * @param depth the depth of the schema in the tree
 * @returns the preprocessed schema
 */
export function preprocessSchema(
  schema: JsonSchemaObjectType,
  depth: number = 0
): JsonSchemaObjectType {
  debuggingService.addPreprocessingStep(depth, 'start preprocessing', schema);

  let copiedSchema = schema;
  if (depth == 0) {
    // only clone at root level
    copiedSchema = _.cloneDeep(schema);
  }

  if (hasRef(copiedSchema)) {
    copiedSchema = resolveReference(copiedSchema, depth);
  }

  if (hasAllOfs(copiedSchema)) {
    // @ts-ignore
    copiedSchema.allOf = copiedSchema.allOf!!.map(subSchema =>
      preprocessSchema(subSchema as JsonSchemaObjectType, depth + 1)
    );
    copiedSchema = mergeAllOfs(copiedSchema as JsonSchemaObjectType, depth);
  }

  convertTypesToOneOf(copiedSchema, depth);
  removeIncompatibleOneOfs(copiedSchema, depth);
  removeIncompatibleAnyOfs(copiedSchema, depth);
  copiedSchema = mergeSingularOneOf(copiedSchema, depth);
  copiedSchema = mergeSingularAnyOf(copiedSchema, depth);
  attemptMergeOneOfsIntoAnyOfs(copiedSchema, depth);
  preprocessOneOfs(copiedSchema, depth);
  preprocessAnyOfs(copiedSchema, depth);
  // TODO: deal with case where there is anyOf and oneOf --> show both options in GUI?

  induceTitles(copiedSchema, depth);

  convertConstToEnum(copiedSchema, depth);
  injectTypesOfEnum(copiedSchema, depth);

  return copiedSchema;
}

function hasRef(schema: JsonSchemaObjectType): boolean {
  return schema.$ref !== undefined;
}

function convertTypesToOneOf(schema: JsonSchemaObjectType, depth: number) {
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

      newOneOfs.push(preprocessSchema(typeSchema as JsonSchemaObjectType, depth + 1));
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
          allOf: [
            typeSchema as JsonSchemaObjectType,
            preprocessSchema(originalOneOf as JsonSchemaObjectType, depth + 1),
          ],
        };
        const newOneOf = safeMergeAllOfs(combinedSchema, depth);
        newOneOfs.push(newOneOf);
      });
    });
    schema.oneOf = newOneOfs;
    delete schema.type;

    debuggingService.addPreprocessingStep(depth, 'converted types to oneOfs', schema);
  }
}

// It can happen that a schema has both oneOfs and anyOfs.
// When this is the case, the user will have to manually select both a
// oneOf sub-schema, and a set of anyOf sub-schemata.
// Sometimes, the oneOf choice is implicitly given by making an anyOf selection.
// This function will merge all oneOfs into anyOfs, where those oneOfs are
// the only oneOf choice for the given anyOf.
// If for every anyOf only one oneOf is possible, the oneOf property is
// removed from the schema altogether.
function attemptMergeOneOfsIntoAnyOfs(schema: JsonSchemaObjectType, depth: number) {
  if (hasAnyOfs(schema) && hasOneOfs(schema)) {
    let someAnyOfHasMultipleOneOfOptions = false;

    for (let i = 0; i < schema.anyOf!!.length; i++) {
      const subSchemaAnyOf = schema.anyOf!![i];

      const mergedOneOfs: JsonSchemaObjectType[] = [];

      schema.oneOf!!.forEach(subSchemaOneOf => {
        const mergeResult = safeMergeSchemas(
          subSchemaAnyOf as JsonSchemaObjectType,
          subSchemaOneOf as JsonSchemaObjectType,
          depth
        );
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
    debuggingService.addPreprocessingStep(depth, 'merged oneOfs into anyOfs', schema);
  }
}

function preprocessAnyOfs(schema: JsonSchemaObjectType, depth: number) {
  if (hasAnyOfs(schema)) {
    // @ts-ignore
    schema.anyOf = schema.anyOf!!.map(subSchema => {
      return preprocessSchema(subSchema as JsonSchemaObjectType, depth + 1);
    });

    debuggingService.addPreprocessingStep(depth, 'preprocessed anyOfs', schema);
  }
}

function preprocessOneOfs(schema: JsonSchemaObjectType, depth: number) {
  if (hasOneOfs(schema)) {
    // @ts-ignore
    schema.oneOf = schema.oneOf!!.map(subSchema => {
      return preprocessSchema(subSchema as JsonSchemaObjectType, depth + 1);
    });

    debuggingService.addPreprocessingStep(depth, 'preprocessed oneOfs', schema);
  }
}

function removeIncompatibleAnyOfs(schema: JsonSchemaObjectType, depth: number) {
  if (hasAnyOfs(schema)) {
    // @ts-ignore
    schema.anyOf = schema.anyOf!!.map(subSchema => {
      const copiedSchemaWithoutAnyOf = {...schema};
      delete copiedSchemaWithoutAnyOf.anyOf;
      if (
        !areSchemasCompatible(copiedSchemaWithoutAnyOf, subSchema as JsonSchemaObjectType, depth)
      ) {
        return false;
      } else {
        return subSchema;
      }
    });
    // remove oneOfs that are not compatible with parent
    schema.anyOf = schema.anyOf.filter(anyOf => anyOf != false);

    debuggingService.addPreprocessingStep(depth, 'removed incompatible anyOfs', schema);
  }
}
function removeIncompatibleOneOfs(schema: JsonSchemaObjectType, depth: number) {
  if (hasOneOfs(schema)) {
    // @ts-ignore
    schema.oneOf = schema.oneOf!!.map(subSchema => {
      const copiedSchemaWithoutOneOf = {...schema};
      delete copiedSchemaWithoutOneOf.oneOf;
      if (
        !areSchemasCompatible(copiedSchemaWithoutOneOf, subSchema as JsonSchemaObjectType, depth)
      ) {
        return false;
      } else {
        return subSchema;
      }
    });
    // remove oneOfs that are not compatible with parent
    schema.oneOf = schema.oneOf.filter(oneOf => oneOf != false);

    debuggingService.addPreprocessingStep(depth, 'removed incompatible oneOfs', schema);
  }
}

function areSchemasCompatible(
  schemaA: JsonSchemaObjectType,
  schemaB: JsonSchemaObjectType,
  depth: number
): boolean {
  const mergeResult = safeMergeSchemas(schemaA, schemaB, depth);
  return mergeResult != false;
}

function safeMergeSchemas(
  schemaA: JsonSchemaObjectType,
  schemaB: JsonSchemaObjectType,
  depth: number
): JsonSchemaObjectType | false {
  const combinedSchema = {
    allOf: [schemaA, schemaB],
  };
  return safeMergeAllOfs(combinedSchema as JsonSchemaObjectType, depth);
}

// if oneOf has just one entry: merge into parent
function mergeSingularOneOf(schema: JsonSchemaObjectType, depth: number): JsonSchemaObjectType {
  if (hasOneOfs(schema)) {
    if (schema.oneOf!!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.oneOf;
      return mergeSchemas(
        preprocessSchema(schema.oneOf!![0] as JsonSchemaObjectType),
        preprocessSchema(copiedSchema)
      );
    } else if (schema.oneOf!!.length == 0) {
      throw Error('oneOf array has zero entries for schema ' + JSON.stringify(schema));
    }
  }

  return schema;
}

// if anyOf has just one entry: merge into parent
function mergeSingularAnyOf(schema: JsonSchemaObjectType, depth: number): JsonSchemaObjectType {
  if (hasAnyOfs(schema)) {
    if (schema.anyOf!!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.anyOf;
      return mergeSchemas(
        preprocessSchema(schema.anyOf!![0] as JsonSchemaObjectType),
        preprocessSchema(copiedSchema)
      );
    } else if (schema.anyOf!!.length == 0) {
      throw Error('anyOf array has zero entries for schema ' + JSON.stringify(schema));
    }
  }

  return schema;
}

function resolveReference(copiedSchema: JsonSchemaObjectType, depth: number) {
  // remove leading # from ref if present
  const refString = copiedSchema.$ref?.startsWith('#')
    ? copiedSchema.$ref.substring(1)
    : copiedSchema.$ref!!;

  let refSchema: any;
  if (preprocessedRefSchemas.has(refString)) {
    refSchema = preprocessedRefSchemas.get(refString);
  } else {
    refSchema = pointer.get(
      nonBooleanSchema(useSessionStore().fileSchemaData ?? {}) ?? {},
      refString
    );
    refSchema = preprocessSchema(refSchema, depth + 1);
    preprocessedRefSchemas.set(refString, refSchema);
  }

  delete copiedSchema.$ref;

  const result = {allOf: [refSchema, copiedSchema]};
  debuggingService.addPreprocessingStep(depth, 'resolved reference', result);
  return result;
}

function induceTitles(schema: JsonSchemaObjectType, depth: number): void {
  const schemaBefore = JSON.stringify(schema);
  induceTitlesOnObject(schema.properties ?? {});
  induceTitlesOnObject(schema.definitions ?? {});
  induceTitlesOnObject(schema.$defs ?? {});

  if (JSON.stringify(schema) !== schemaBefore) {
    debuggingService.addPreprocessingStep(depth, 'induced titles', schema);
  }
}

function induceTitlesOnObject(object: object) {
  Object.entries(object).forEach(([key, value]) => {
    if (typeof value === 'object') {
      if (value.title === undefined) {
        value.title = key;
      }
    }
  });
}

function convertConstToEnum(schema: JsonSchemaObjectType, depth: number): void {
  if (schema.const !== undefined) {
    schema.enum = [schema.const];
    delete schema.const;

    debuggingService.addPreprocessingStep(depth, 'converted const to enum', schema);
  }
}

function injectTypesOfEnum(schema: JsonSchemaObjectType, depth: number): void {
  const foundTypes = new Set<SchemaPropertyType>();
  const enumValues = schema.enum;
  if (enumValues !== undefined && enumValues.length > 0) {
    enumValues.forEach(value => {
      switch (typeof value) {
        case 'string':
          foundTypes.add('string');
          break;
        case 'number':
          foundTypes.add('number');
          break;
        case 'boolean':
          foundTypes.add('boolean');
          break;
        case 'object':
          if (Array.isArray(value)) {
            foundTypes.add('array');
          } else if (value === null) {
            foundTypes.add('null');
          } else {
            foundTypes.add('object');
          }
          break;
      }
    });
  }

  if (schema.type === undefined && foundTypes.size > 0) {
    schema.type = [...foundTypes];
    debuggingService.addPreprocessingStep(depth, 'injected types of enum', schema);
  }
}

function hasAllOfs(schema: JsonSchemaObjectType): boolean {
  return schema.allOf !== undefined && schema.allOf.length > 0;
}
function hasOneOfs(schema: JsonSchemaObjectType): boolean {
  return schema.oneOf !== undefined && schema.oneOf.length > 0;
}
function hasAnyOfs(schema: JsonSchemaObjectType): boolean {
  return schema.anyOf !== undefined && schema.anyOf.length > 0;
}
