import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import {NUMBER_OF_PROPERTY_TYPES} from '@/schema/jsonSchemaType';
import type {Path} from "@/utility/path";

/**
 * Returns a string representation of the type of the property.
 * This does not necessarily match one of the JSON schema types,
 * e.g, it returns 'enum' if the property has an enum.
 */
export function getTypeDescription(schema: JsonSchemaObjectType): string {
  if (schema.enum) {
    return 'enum';
  }
  if (schema.oneOf && schema.oneOf.length > 0) {
    return 'oneOf';
  }
  if (schema.anyOf && schema.anyOf.length > 0) {
    return 'anyOf';
  }

  const type = schema.type || 'undefined';
  if (Array.isArray(type)) {
    if (type.length === NUMBER_OF_PROPERTY_TYPES) {
      return 'any';
    }
    return type.join(', ');
  }

  return type;
}

export function isSchemaEmpty(schema: JsonSchemaType): boolean {
  if (schema === undefined || schema === null) {
    return true;
  }
  if (schema == true || schema == false) {
    return false;
  }
  return Object.keys(schema).length === 0;
}

export function collectObjectDefinitionPaths(schema: JsonSchemaType): Path[] {
    if (schema == true || schema == false) {
        return [];
    }

    const result: Path[] = [];
    if (schema.definitions) {
        for (const [key, value] of Object.entries(schema.definitions)) {
            result.push(['definitions', key]);
        }
    }
    if (schema.$defs) {
        for (const [key, value] of Object.entries(schema.$defs)) {
            result.push(['$defs', key])
        }
    }
    return result;
}
