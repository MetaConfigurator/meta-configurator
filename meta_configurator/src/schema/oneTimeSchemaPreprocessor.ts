import type {
  JsonSchemaObjectType,
  JsonSchemaType,
  JsonSchemaTypePreprocessed,
  SchemaPropertyType,
} from '@/model/jsonSchemaType';
import _ from 'lodash';
import 'crypto';

/**
 * One time schema preprocessor.
 * This will preprocess the schema once, so that it can be used for the GUI.
 * This will not modify the original schema.
 *
 * The following steps are performed:
 * - add title if not present in properties and definitions
 * - convert const to enum
 * - inject types of enum to types property
 *
 * @param schema the schema to preprocess
 * @returns preprocessed schema
 */
export function preprocessOneTime(schema: JsonSchemaType): JsonSchemaTypePreprocessed {
  if (typeof schema !== 'object') {
    return schema;
  }

  // clone schema so the original schema (of the user) is not modified
  const schemaCopy = _.cloneDeep(schema);

  const id = schemaCopy.$id || schemaCopy.id || crypto.randomUUID();

  preprocessOneTimeRecursive(schemaCopy, id);

  return schemaCopy;
}

function preprocessOneTimeRecursive(schema: JsonSchemaType | undefined, schemaPath: string): void {
  if (schema === undefined || typeof schema !== 'object') {
    return;
  }

  induceTitles(schema);

  convertConstToEnum(schema);
  injectTypesOfEnum(schema);

  preprocessSchemaRecord(schema.definitions, `${schemaPath}/definitions`);
  preprocessSchemaRecord(schema.$defs, `${schemaPath}/$defs`);
  preprocessSchemaRecord(schema.properties, `${schemaPath}/properties`);
  preprocessSchemaRecord(schema.patternProperties, `${schemaPath}/patternProperties`);
  preprocessSchemaRecord(schema.dependentSchemas, `${schemaPath}/dependentSchemas`);

  preprocessSchemaArray(schema.allOf, `${schemaPath}/allOf`);
  preprocessSchemaArray(schema.anyOf, `${schemaPath}/anyOf`);
  preprocessSchemaArray(schema.oneOf, `${schemaPath}/oneOf`);
  preprocessSchemaArray(schema.prefixItems, `${schemaPath}/prefixItems`);

  preprocessOneTimeRecursive(schema.items, `${schemaPath}/items`);
  preprocessOneTimeRecursive(schema.contains, `${schemaPath}/contains`);
  preprocessOneTimeRecursive(schema.additionalProperties, `${schemaPath}/additionalProperties`);
  preprocessOneTimeRecursive(schema.propertyNames, `${schemaPath}/propertyNames`);
  preprocessOneTimeRecursive(schema.if, `${schemaPath}/if`);
  preprocessOneTimeRecursive(schema.then, `${schemaPath}/then`);
  preprocessOneTimeRecursive(schema.else, `${schemaPath}/else`);
  preprocessOneTimeRecursive(schema.not, `${schemaPath}/not`);
  preprocessOneTimeRecursive(schema.unevaluatedItems, `${schemaPath}/unevaluatedItems`);
  preprocessOneTimeRecursive(schema.unevaluatedProperties, `${schemaPath}/unevaluatedProperties`);
  preprocessOneTimeRecursive(schema.contentSchema, `${schemaPath}/contentSchema`);
}

function preprocessSchemaArray(
  schemaArray: JsonSchemaType[] | undefined,
  schemaPath: string
): void {
  if (schemaArray !== undefined && Array.isArray(schemaArray)) {
    for (const [index, value] of schemaArray.entries()) {
      preprocessOneTimeRecursive(value, `${schemaPath}/${index}`);
    }
  }
}

function preprocessSchemaRecord(
  schemaRecord: Record<string, JsonSchemaType> | undefined,
  schemaPath: string
): void {
  if (schemaRecord !== undefined && typeof schemaRecord === 'object') {
    for (const [key, value] of Object.entries(schemaRecord)) {
      preprocessOneTimeRecursive(value, `${schemaPath}/${key}`);
    }
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
