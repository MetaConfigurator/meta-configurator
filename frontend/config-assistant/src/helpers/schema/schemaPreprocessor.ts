import type {
  JsonSchemaObjectType,
  JsonSchemaType,
  SchemaPropertyType,
} from '@/model/JsonSchemaType';
import pointer from 'json-pointer';
import {useSessionStore} from '@/store/sessionStore';
import {nonBooleanSchema} from '@/helpers/schema/SchemaUtils';
import {mergeAllOfs, safeMergeAllOfs} from '@/helpers/schema/mergeAllOfs';

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
 * @returns the preprocessed schema
 */
export function preprocessSchema(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  let copiedSchema = {...schema}; // shallow copy to prevent changing the original schema
  if (hasRef(copiedSchema)) {
    copiedSchema = resolveReference(copiedSchema);
  }

  if (hasAllOfs(copiedSchema)) {
    // @ts-ignore
    copiedSchema.allOf = copiedSchema.allOf!!.map(subSchema =>
      preprocessSchema(subSchema as JsonSchemaObjectType)
    );
    copiedSchema = mergeAllOfs(copiedSchema as JsonSchemaObjectType);
  }

  convertTypesToOneOf(copiedSchema);
  removeIncompatibleOneOfs(copiedSchema);
  removeIncompatibleAnyOfs(copiedSchema);
  copiedSchema = mergeSingularOneOf(copiedSchema);
  copiedSchema = mergeSingularAnyOf(copiedSchema);
  attemptMergeOneOfsIntoAnyOfs(copiedSchema);
  preprocessOneOfs(copiedSchema);
  preprocessAnyOfs(copiedSchema);
  // TODO: deal with case where there is anyOf and oneOf --> show both options in GUI?

  induceTitles(copiedSchema);

  convertConstToEnum(copiedSchema);
  injectTypesOfEnum(copiedSchema);

  return copiedSchema;
}

function hasRef(schema: JsonSchemaObjectType): boolean {
  return schema.$ref !== undefined;
}

function convertTypesToOneOf(schema: JsonSchemaObjectType) {
  if (!Array.isArray(schema.type)) {
    return;
  }

  if (schema.type.length == 1) {
    schema.type = schema.type[0];
    return;
  }

  // easier scenario: no oneOfs
  if (!hasOneOfs(schema) && schema.type.length > 1) {
    let newOneOfs: JsonSchemaType[] = [];

    schema.type.forEach(propertyType => {
      const typeSchema = {
        type: propertyType,
      };

      newOneOfs.push(preprocessSchema(typeSchema as JsonSchemaObjectType));
    });

    schema.oneOf = newOneOfs;
    delete schema.type;
  } else {
    // more difficult scenario: oneOfs exist. Multiply original oneOfs with types
    let newOneOfs: JsonSchemaType[] = [];
    schema.type.forEach(propertyType => {
      const typeSchema = {
        type: propertyType,
      };

      schema.oneOf!.forEach((originalOneOf: JsonSchemaType) => {
        const combinedSchema = {
          allOf: [
            typeSchema as JsonSchemaObjectType,
            preprocessSchema(originalOneOf as JsonSchemaObjectType),
          ],
        };
        const newOneOf = safeMergeAllOfs(combinedSchema);
        newOneOfs.push(newOneOf);
      });
    });
    schema.oneOf = newOneOfs;
    delete schema.type;
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
function attemptMergeOneOfsIntoAnyOfs(schema: JsonSchemaObjectType) {
  if (hasAnyOfs(schema) && hasOneOfs(schema)) {
    let someAnyOfHasMultipleOneOfOptions = false;

    for (let i = 0; i < schema.anyOf!!.length; i++) {
      const subSchemaAnyOf = schema.anyOf!![i];

      let mergedOneOfs: JsonSchemaObjectType[] = [];

      schema.oneOf!!.forEach(subSchemaOneOf => {
        const mergeResult = safeMergeSchemas(
          subSchemaAnyOf as JsonSchemaObjectType,
          subSchemaOneOf as JsonSchemaObjectType
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
  }
}

function preprocessAnyOfs(schema: JsonSchemaObjectType) {
  if (hasAnyOfs(schema)) {
    // @ts-ignore
    schema.anyOf = schema.anyOf!!.map(subSchema => {
      return preprocessSchema(subSchema as JsonSchemaObjectType);
    });
  }
}

function preprocessOneOfs(schema: JsonSchemaObjectType) {
  if (hasOneOfs(schema)) {
    // @ts-ignore
    schema.oneOf = schema.oneOf!!.map(subSchema => {
      return preprocessSchema(subSchema as JsonSchemaObjectType);
    });
  }
}

function removeIncompatibleAnyOfs(schema: JsonSchemaObjectType) {
  if (hasAnyOfs(schema)) {
    // @ts-ignore
    schema.anyOf = schema.anyOf!!.map(subSchema => {
      const copiedSchemaWithoutAnyOf = {...schema};
      delete copiedSchemaWithoutAnyOf.anyOf;
      if (!areSchemasCompatible(copiedSchemaWithoutAnyOf, subSchema as JsonSchemaObjectType)) {
        return false;
      } else {
        return subSchema;
      }
    });
    // remove oneOfs that are not compatible with parent
    schema.anyOf = schema.anyOf.filter(anyOf => anyOf != false);
  }
}
function removeIncompatibleOneOfs(schema: JsonSchemaObjectType) {
  if (hasOneOfs(schema)) {
    // @ts-ignore
    schema.oneOf = schema.oneOf!!.map(subSchema => {
      const copiedSchemaWithoutOneOf = {...schema};
      delete copiedSchemaWithoutOneOf.oneOf;
      if (!areSchemasCompatible(copiedSchemaWithoutOneOf, subSchema as JsonSchemaObjectType)) {
        return false;
      } else {
        return subSchema;
      }
    });
    // remove oneOfs that are not compatible with parent
    schema.oneOf = schema.oneOf.filter(oneOf => oneOf != false);
  }
}

function areSchemasCompatible(
  schemaA: JsonSchemaObjectType,
  schemaB: JsonSchemaObjectType
): boolean {
  const mergeResult = safeMergeSchemas(schemaA, schemaB);
  return mergeResult != false;
}

function safeMergeSchemas(
  schemaA: JsonSchemaObjectType,
  schemaB: JsonSchemaObjectType
): JsonSchemaObjectType | false {
  const combinedSchema = {
    allOf: [schemaA, schemaB],
  };
  return safeMergeAllOfs(combinedSchema as JsonSchemaObjectType);
}

// if oneOf has just one entry: merge into parent
function mergeSingularOneOf(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  if (hasOneOfs(schema)) {
    if (schema.oneOf!!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.oneOf;
      let optimizedSchema = {
        allOf: [
          preprocessSchema(schema.oneOf!![0] as JsonSchemaObjectType),
          preprocessSchema(copiedSchema),
        ],
      };
      return mergeAllOfs(optimizedSchema);
    } else if (schema.oneOf!!.length == 0) {
      throw Error('oneOf array has zero entries for schema ' + JSON.stringify(schema));
    }
  }

  return schema;
}

// if anyOf has just one entry: merge into parent
function mergeSingularAnyOf(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  if (hasAnyOfs(schema)) {
    if (schema.anyOf!!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.anyOf;
      let optimizedSchema = {
        allOf: [
          preprocessSchema(schema.anyOf!![0] as JsonSchemaObjectType),
          preprocessSchema(copiedSchema),
        ],
      };
      return mergeAllOfs(optimizedSchema);
    } else if (schema.anyOf!!.length == 0) {
      throw Error('anyOf array has zero entries for schema ' + JSON.stringify(schema));
    }
  }

  return schema;
}

function resolveReference(copiedSchema: JsonSchemaObjectType) {
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
    refSchema = preprocessSchema(refSchema);
    preprocessedRefSchemas.set(refString, refSchema);
  }

  delete copiedSchema.$ref;
  return {allOf: [refSchema, copiedSchema]};
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

function induceTitles(schema: JsonSchemaObjectType): void {
  induceTitlesOnObject(schema.properties ?? {});
  induceTitlesOnObject(schema.definitions ?? {});
  induceTitlesOnObject(schema.$defs ?? {});
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

function convertConstToEnum(schema: JsonSchemaObjectType): void {
  if (schema.const !== undefined) {
    schema.enum = [schema.const];
    delete schema.const;
  }
}

function injectTypesOfEnum(schema: JsonSchemaObjectType): void {
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
  }
}
