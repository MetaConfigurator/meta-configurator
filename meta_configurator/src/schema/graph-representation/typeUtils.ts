import type {JsonSchemaObjectType, SchemaPropertyTypes} from '@/schema/jsonSchemaType';
import {pathToJsonPointer} from '@/utility/pathUtils';
import {SchemaNodeData} from '@/schema/graph-representation/schemaGraphTypes';
import type {Path} from '@/utility/path';

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
    const objectName: string = def[def.length - 1].toString();
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
  if (schema.type !== typeChoiceSchema.type) {
    return false;
  }

  if (schema.type === 'array') {
    return isSchemaMatchingTypeChoice(
      schema.items as JsonSchemaObjectType,
      typeChoiceSchema.items as JsonSchemaObjectType
    );
  }

  if (schema.$ref != typeChoiceSchema.$ref) {
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
