import type {JsonSchemaObjectType, JsonSchemaType} from '@/model/JsonSchemaType';
import pointer from 'json-pointer';
import {useSessionStore} from '@/store/sessionStore';
import {nonBooleanSchema} from '@/helpers/schema/SchemaUtils';
import {
  areSchemasCompatible,
  mergeSchemas,
  safeMergeAllOfs,
  safeMergeSchemas,
} from '@/helpers/schema/mergeAllOfs';

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
  if (hasRef(schema)) {
    schema = resolveReference(schema);
  }

  schema = handleAllOfs(schema);
  convertTypesToOneOf(schema);
  removeIncompatibleOneOfs(schema);
  removeIncompatibleAnyOfs(schema);
  schema = mergeSingularOneOf(schema);
  schema = mergeSingularAnyOf(schema);
  attemptMergeOneOfsIntoAnyOfs(schema);
  preprocessOneOfs(schema);
  preprocessAnyOfs(schema);
  // TODO: deal with case where there is anyOf and oneOf --> show both options in GUI?

  return schema;
}

function hasRef(schema: JsonSchemaObjectType): boolean {
  return schema.$ref !== undefined;
}

function handleAllOfs(schema: JsonSchemaObjectType) {
  if (hasAllOfs(schema)) {
    // @ts-ignore
    schema.allOf = schema.allOf!!.map(subSchema =>
      preprocessSchema(subSchema as JsonSchemaObjectType)
    );
    schema = mergeAllOfs(schema as JsonSchemaObjectType);
  }
  return schema;
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
    const newOneOfs: JsonSchemaType[] = [];

    schema.type.forEach(propertyType => {
      const typeSchema = {
        type: propertyType,
      };

      newOneOfs.push(typeSchema as JsonSchemaObjectType);
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

      const mergedOneOfs: JsonSchemaObjectType[] = [];

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
    // console.groupCollapsed('removeIncompatibleAnyOfs')
    // console.log('schema.anyOf before', schema.anyOf);
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
    // console.log('schema.anyOf after', schema.anyOf)
    // console.groupEnd();
  }
}

function removeIncompatibleOneOfs(schema: JsonSchemaObjectType) {
  if (hasOneOfs(schema)) {
    // console.groupCollapsed('removeIncompatibleOneOfs');
    // console.log('schema.oneOf before', schema.oneOf);
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
    /* console.log('schema.oneOf after', schema.oneOf)
    console.groupEnd(); */
  }
}

// if oneOf has just one entry: merge into parent
function mergeSingularOneOf(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  if (hasOneOfs(schema)) {
    if (schema.oneOf!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.oneOf;
      return mergeSchemas(
        preprocessSchema(schema.oneOf![0] as JsonSchemaObjectType),
        preprocessSchema(copiedSchema)
      );
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

const anyType: SchemaPropertyType[] = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
  'null',
];

function addAnyTypeIfNecessary(schema: JsonSchemaType | undefined): JsonSchemaType {
  // TODO this implementation does not 100% work yet
  // and causes performance issues
  if (schema === undefined || schema === true) {
    return {
      type: anyType,
    };
  }
  if (typeof schema !== 'object') {
    return schema;
  }
  if (schema.type === undefined) {
    const copiedSchema = {...schema};
    copiedSchema.type = anyType;
    return copiedSchema;
  }

  return schema;
}

function addAnyTypeToProperties(properties: Record<string, JsonSchemaType>) {
  const copiedProperties = {...properties};
  Object.entries(copiedProperties).forEach(([key, value]) => {
    copiedProperties[key] = addAnyTypeIfNecessary(value);
  });
  return copiedProperties;
}

function isOfTypeObject(schema: JsonSchemaObjectType) {
  return schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'));
}

function isOfTypeArray(schema: JsonSchemaObjectType) {
  return schema.type === 'array' || (Array.isArray(schema.type) && schema.type.includes('array'));
}

function addAnyTypeToPropertiesWithoutType(schema: JsonSchemaObjectType) {
  if (isOfTypeObject(schema)) {
    schema.additionalProperties = addAnyTypeIfNecessary(schema.additionalProperties);

    if (schema.properties !== undefined) {
      schema.properties = addAnyTypeToProperties(schema.properties);
    }
    if (schema.patternProperties !== undefined) {
      schema.patternProperties = addAnyTypeToProperties(schema.patternProperties);
    }
  }

  if (isOfTypeArray(schema)) {
    schema.items = addAnyTypeIfNecessary(schema.items);
  }
}

function resolveReference(schema: JsonSchemaObjectType) {
  // remove leading # from ref if present
  const refString = schema.$ref?.startsWith('#') ? schema.$ref.substring(1) : schema.$ref!!;

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

  delete schema.$ref;
  return {
    allOf: [refSchema, schema],
  };
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
