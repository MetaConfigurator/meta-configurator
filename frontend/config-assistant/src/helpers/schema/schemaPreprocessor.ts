import type {JsonSchemaObjectType, SchemaPropertyType} from '@/model/JsonSchemaType';
import pointer from 'json-pointer';
import {useSessionStore} from '@/store/sessionStore';
import {nonBooleanSchema} from '@/helpers/schema/SchemaUtils';
import {mergeAllOfs} from '@/helpers/schema/mergeAllOfs';

const preprocessedRefSchemas: Map<string, JsonSchemaObjectType> = new Map();

/**
 * Preprocesses the schema.
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

  if (hasOneOfs(copiedSchema)) {
    // @ts-ignore
    copiedSchema.oneOf = copiedSchema.oneOf!!.map(subSchema => {
      const copiedSchemaWithoutOneOf = {...copiedSchema};
      delete copiedSchemaWithoutOneOf.oneOf;
      delete copiedSchemaWithoutOneOf.title;
      delete copiedSchemaWithoutOneOf.description;
      const resultSchema = {
        allOf: [preprocessSchema(subSchema as JsonSchemaObjectType), copiedSchemaWithoutOneOf],
      };
      return mergeAllOfs(resultSchema as JsonSchemaObjectType);
    });
  }

  if (hasAnyOfs(copiedSchema)) {
    // @ts-ignore
    copiedSchema.anyOf = copiedSchema.anyOf!!.map(subSchema => {
      const copiedSchemaWithoutAnyOf = {...copiedSchema};
      delete copiedSchemaWithoutAnyOf.anyOf;
      delete copiedSchemaWithoutAnyOf.title;
      delete copiedSchemaWithoutAnyOf.description;
      const resultSchema = {
        allOf: [preprocessSchema(subSchema as JsonSchemaObjectType), copiedSchemaWithoutAnyOf],
      };
      return mergeAllOfs(resultSchema as JsonSchemaObjectType);
    });
  }

  optimizeSchema(copiedSchema);

  induceTitles(copiedSchema);

  convertConstToEnum(copiedSchema);
  injectTypesOfEnum(copiedSchema);

  return copiedSchema;
}

function hasRef(schema: JsonSchemaObjectType): boolean {
  return schema.$ref !== undefined;
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

function optimizeSchema(schema: JsonSchemaObjectType) {
  if (hasOneOfs(schema)) {
    // TODO: if it is just oneOf of types, then replace it by a choice of types
  }
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
