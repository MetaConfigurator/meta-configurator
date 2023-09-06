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
 * - For all oneOfs and anyOfs: copies the property schema into the sub-schemas
 * - Induce title for schema if it does not have title defined
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
  console.log('preprocess schema ', {...copiedSchema});

  if (hasAllOfs(copiedSchema)) {
    // @ts-ignore
    copiedSchema.allOf = copiedSchema.allOf!!.map(subSchema =>
      preprocessSchema(subSchema as JsonSchemaObjectType)
    );
    console.log('basic merge allOfs for ', copiedSchema);
    copiedSchema = mergeAllOfs(copiedSchema as JsonSchemaObjectType);
  }

  console.log('start convert types to OneOf', {...copiedSchema});
  convertTypesToOneOf(copiedSchema);
  console.log('finished convert types to OneOf', {...copiedSchema});
  preprocessOneOfs(copiedSchema);
  //copiedSchema = removeRedundantOneOfs(copiedSchema)
  preprocessAnyOfs(copiedSchema);
  //copiedSchema = removeRedundantAnyOfs(copiedSchema)

  induceTitles(copiedSchema);

  convertConstToEnum(copiedSchema);
  injectTypesOfEnum(copiedSchema);
  console.log('finish preprocess schema ', {...copiedSchema});

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
    console.log('XYX has types and no one of ', {...schema});
    let newOneOfs: JsonSchemaType[] = [];

    schema.type.forEach(propertyType => {
      const typeSchema = {
        type: propertyType,
      };

      newOneOfs.push(preprocessSchema(typeSchema as JsonSchemaObjectType));
    });

    schema.oneOf = newOneOfs;
    delete schema.type;
    console.log('XYX afterwards ', {...schema});
  } else {
    // more difficult scenario: oneOfs exist. Multiply original oneOfs with types
    let newOneOfs: JsonSchemaType[] = [];
    schema.type.forEach(propertyType => {
      const typeSchema = {
        type: propertyType,
      };

      schema.oneOf!.forEach((originalOneOf: JsonSchemaType) => {
        // TODO: handle case where OneOfs already have one or more types
        const combinedSchema = {
          allOf: [
            preprocessSchema(typeSchema as JsonSchemaObjectType),
            preprocessSchema(originalOneOf as JsonSchemaObjectType),
          ],
        };
        console.log('merge all of trigger with combinedSchema ', {...combinedSchema});
        const newOneOf = mergeAllOfs(combinedSchema);
        newOneOfs.push(newOneOf);
      });
    });
    schema.oneOf = newOneOfs;
    delete schema.type;
  }
}

function preprocessAnyOfs(schema: JsonSchemaObjectType) {
  if (hasAnyOfs(schema)) {
    // @ts-ignore
    schema.anyOf = schema.anyOf!!.map(subSchema => {
      const copiedSchemaWithoutAnyOf = {...schema};
      delete copiedSchemaWithoutAnyOf.anyOf;
      delete copiedSchemaWithoutAnyOf.title;
      delete copiedSchemaWithoutAnyOf.description;
      const resultSchema = {
        allOf: [preprocessSchema(subSchema as JsonSchemaObjectType), copiedSchemaWithoutAnyOf],
      };
      console.log('merge all of trigger with resultSchema from anyOfs ', {...resultSchema});
      // use safeMergeAllOfs because it can happen that resulting schema is not valid
      // For example when schema with type: object and a oneOf that has one option with type object and
      // another object with type boolean, then the option with boolean will never be valid.
      // In that scenario, safeMergeAllOfs will return the 'false' schema value.
      return safeMergeAllOfs(resultSchema as JsonSchemaObjectType);
    });

    if (schema.anyOf.filter(item => item == false).length > 0) {
      console.log('anyOf got an invalid subschema that will be removed');
    }
    schema.anyOf = schema.anyOf.filter(anyOf => anyOf != false);
  }
}

function preprocessOneOfs(schema: JsonSchemaObjectType) {
  if (hasOneOfs(schema)) {
    console.log('preprocess oneOfs for ', schema);
    // @ts-ignore
    schema.oneOf = schema.oneOf!!.map(subSchema => {
      const copiedSchemaWithoutOneOf = {...schema};
      delete copiedSchemaWithoutOneOf.oneOf;
      delete copiedSchemaWithoutOneOf.title;
      delete copiedSchemaWithoutOneOf.description;
      console.log('preprocess oneOf subSchema ', subSchema, ' and copied schema withoutOneOf ', {
        ...copiedSchemaWithoutOneOf,
      });
      const resultSchema = {
        allOf: [preprocessSchema(subSchema as JsonSchemaObjectType), copiedSchemaWithoutOneOf],
      };
      console.log('merge all of trigger with resultSchema from oneOfs ', resultSchema);
      // use safeMergeAllOfs because it can happen that resulting schema is not valid
      // For example when schema with type: object and a oneOf that has one option with type object and
      // another object with type boolean, then the option with boolean will never be valid.
      // In that scenario, safeMergeAllOfs will return the 'false' schema value.
      return safeMergeAllOfs(resultSchema as JsonSchemaObjectType);
    });

    if (schema.oneOf.filter(item => item == false).length > 0) {
      console.log('oneOf got an invalid subschema that will be removed');
    }
    schema.oneOf = schema.oneOf.filter(oneOf => oneOf != false);
  }
}

function removeRedundantOneOfs(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  console.log('remove redundant oneOfs');
  if (hasOneOfs(schema)) {
    if (schema.oneOf!!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.oneOf;
      let optimizedSchema = {
        allOf: [schema.oneOf!![0], copiedSchema],
      };
      console.log('remove redundant oneOfs mergeAllOfs ', {...optimizedSchema});
      return mergeAllOfs(optimizedSchema);
    } else if (schema.oneOf!!.length == 0) {
      console.log('Impossible oneOfs found for ', {...schema});
    }
  }

  return schema;
}
function removeRedundantAnyOfs(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  console.log('remove redundant anyOfs');
  if (hasAnyOfs(schema)) {
    if (schema.anyOf!!.length == 1) {
      const copiedSchema = {...schema};
      delete copiedSchema.anyOf;
      let optimizedSchema = {
        allOf: [schema.anyOf!![0], copiedSchema],
      };
      console.log('remove redundant anyOf mergeAllOfs ', {...optimizedSchema});
      return mergeAllOfs(optimizedSchema);
    } else if (schema.anyOf!!.length == 0) {
      console.log('Impossible anyOf found for ', {...schema});
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
