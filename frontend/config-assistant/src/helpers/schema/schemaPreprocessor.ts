import type {JsonSchemaObjectType, SchemaPropertyType} from '@/model/JsonSchemaType';
// @ts-ignore
import mergeAllOf from 'json-schema-merge-allof';
import pointer from 'json-pointer';
import {useSessionStore} from '@/store/sessionStore';
import {nonBooleanSchema} from '@/helpers/schema/SchemaUtils';

const preprocessedRefSchemas: Map<string, JsonSchemaObjectType> = new Map();

/**
 * Preprocesses the schema.
 *
 * @param schema the schema to preprocess
 * @returns the preprocessed schema
 */
export function preprocessSchema(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  let copiedSchema = {...schema}; // shallow copy to prevent changing the original schema
  // TODO: resolve refs once at the beginning using json-schema-ref-parser
  // this is technically possible because the json schema faker also uses json-schema-ref-parser
  // and it works there
  // so we have to find a way to make it work here as well
  if (hasRef(copiedSchema)) {
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
    copiedSchema = {allOf: [copiedSchema, refSchema]};
  }

  if (hasAllOfs(copiedSchema)) {
    // @ts-ignore
    copiedSchema.allOf = copiedSchema.allOf!!.map((subSchema, index) =>
      preprocessSchema(subSchema as JsonSchemaObjectType)
    );
    copiedSchema = mergeAllOf(copiedSchema, {
      deep: false,
      resolvers: {
        defaultResolver: mergeAllOf.options.resolvers.title,
      },
    });
  }

  if (hasOneOfs(copiedSchema)) {
    // @ts-ignore
    copiedSchema.oneOf = copiedSchema.oneOf!!.map((subSchema, index) => {
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
    copiedSchema.anyOf = copiedSchema.anyOf!!.map((subSchema, index) => {
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

function mergeAllOfs(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  return mergeAllOf(schema, {
    deep: false,
    resolvers: {
      defaultResolver: mergeAllOf.options.resolvers.title,
    },
  });
}

function hasRef(schema: JsonSchemaObjectType): boolean {
  return schema.$ref !== undefined;
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
