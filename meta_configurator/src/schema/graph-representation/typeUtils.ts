import type {
  JsonSchemaObjectType,
  SchemaPropertyType,
  SchemaPropertyTypes,
} from '@/schema/jsonSchemaType';
import {pathToJsonPointer} from '@/utility/pathUtils';
import {SchemaNodeData} from '@/schema/graph-representation/schemaGraphTypes';
import type {Path} from '@/utility/path';
import {cleanupSchemaByType} from '../cleanupSchemaByType';

export type AttributeTypeChoice = {label: string; schema: JsonSchemaObjectType};

export function collectTypeChoices(nodesData: SchemaNodeData[]): AttributeTypeChoice[] {
  const simpleTypes: SchemaPropertyTypes = ['string', 'number', 'integer', 'boolean', 'null'];

  const result: AttributeTypeChoice[] = [];

  simpleTypes.forEach(type => {
    // push simple type
    result.push({
      label: type,
      schema: {
        type: type,
      },
    });

    if (type === 'null') {
      // no need for a null array
      return;
    }

    // push simple type in array
    result.push({
      label: type + '[]',
      schema: {
        type: 'array',
        items: {
          type: type,
        },
      },
    });
  });

  const objectDefs = collectObjectAndEnumDefinitionPathsFromNodes(nodesData);

  objectDefs.forEach(def => {
    const objectName: string = def[def.length - 1]!.toString();
    const pathAsJsonPointer = pathToJsonPointer(def);
    result.push({
      label: objectName,
      schema: {
        $ref: '#' + pathAsJsonPointer,
      },
    });
    result.push({
      label: objectName + '[]',
      schema: {
        type: 'array',
        items: {
          $ref: '#' + pathAsJsonPointer,
        },
      },
    });
  });

  return result;
}

function collectObjectAndEnumDefinitionPathsFromNodes(nodesData: SchemaNodeData[]): Path[] {
  const filteredNodesData = nodesData.filter(data => {
    return data.absolutePath.length > 0 && data.hasUserDefinedName;
  });
  return filteredNodesData.map(data => data.absolutePath);
}

export function determineTypeChoiceBySchema(
  choices: AttributeTypeChoice[],
  schema: JsonSchemaObjectType
): AttributeTypeChoice | undefined {
  for (const choice of choices) {
    if (isSchemaMatchingTypeChoice(schema, choice.schema)) {
      return choice;
    }
  }
  return undefined;
}

function isSchemaMatchingTypeChoice(
  schema: JsonSchemaObjectType,
  typeChoiceSchema: JsonSchemaObjectType
): boolean {
  if (schema === undefined || typeChoiceSchema === undefined) {
    return false;
  }
  if (typeChoiceSchema.$ref !== undefined) {
    return schema.$ref === typeChoiceSchema.$ref && !isSchemaOnlyNull(schema);
  }

  const comparableSchema = getNonNullableSchemaVariant(schema);
  if (comparableSchema.type !== typeChoiceSchema.type) {
    return false;
  }

  if (comparableSchema.type === 'array') {
    return isSchemaMatchingTypeChoice(
      comparableSchema.items as JsonSchemaObjectType,
      typeChoiceSchema.items as JsonSchemaObjectType
    );
  }

  if (comparableSchema.$ref != typeChoiceSchema.$ref) {
    return false;
  }

  return true;
}

export function applyNewType(
  currentSchema: JsonSchemaObjectType,
  typeSchema: JsonSchemaObjectType
) {
  if (typeSchema.type !== undefined) {
    currentSchema.type = typeSchema.type;
    cleanupSchemaByType(currentSchema, typeSchema.type as SchemaPropertyType);
    if (typeSchema.type === 'array') {
      if (
        currentSchema.items === undefined ||
        currentSchema.items === true ||
        currentSchema.items === false
      ) {
        // JSON stringify and parse turns Proxy(Array) into raw Array. otherwise it would write the proxy
        currentSchema.items = JSON.parse(JSON.stringify(typeSchema.items));
      } else {
        applyNewType(currentSchema.items, typeSchema.items as JsonSchemaObjectType);
      }
    } else {
      delete currentSchema.items;
    }
  } else {
    delete currentSchema.type;
  }

  if (typeSchema.$ref) {
    currentSchema.$ref = typeSchema.$ref;
  } else {
    delete currentSchema.$ref;
  }
}

export function isSimpleType(typeDescription: string): boolean {
  return [
    'string',
    'number',
    'integer',
    'boolean',
    'null',
    'string[]',
    'number[]',
    'integer[]',
    'boolean[]',
    'null[]',
  ].includes(typeDescription);
}

function getNonNullableSchemaVariant(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  const directTypes = normalizeTypes(schema.type);
  const nonNullableTypes = directTypes.filter(type => type !== 'null');
  if (nonNullableTypes.length === directTypes.length) {
    return schema;
  }

  const comparableSchema: JsonSchemaObjectType = {...schema};
  if (nonNullableTypes.length === 0) {
    delete comparableSchema.type;
  } else {
    comparableSchema.type = nonNullableTypes.length === 1 ? nonNullableTypes[0] : nonNullableTypes;
  }
  return comparableSchema;
}

function normalizeTypes(types: SchemaPropertyTypes | undefined): SchemaPropertyType[] {
  if (types === undefined) {
    return [];
  }
  return Array.isArray(types) ? [...types] : [types];
}

function isSchemaOnlyNull(schema: JsonSchemaObjectType) {
  const directTypes = normalizeTypes(schema.type);
  return directTypes.length === 1 && directTypes[0] === 'null';
}
