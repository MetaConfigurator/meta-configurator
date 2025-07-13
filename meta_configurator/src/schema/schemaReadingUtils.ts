import type {
  JsonSchemaObjectType,
  JsonSchemaType,
  SchemaPropertyType,
} from '@/schema/jsonSchemaType';
import {NUMBER_OF_PROPERTY_TYPES} from '@/schema/jsonSchemaType';
import type {Path} from '@/utility/path';
import type {ManagedData} from '@/data/managedData';
import type {TopLevelJsonSchemaWrapper} from '@/schema/topLevelJsonSchemaWrapper';

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

export function findAvailableSchemaId(
  schemaData: ManagedData,
  path: Path,
  prefix: string,
  preferWithoutNumber: boolean = false
): Path {
  let num: number = 1;
  let success = false;
  while (num <= 100) {
    const id = num == 1 && preferWithoutNumber ? prefix : prefix + num;
    const fullPath = [...path, id];
    success = schemaData.dataAt(fullPath) === undefined;
    if (success) {
      return fullPath;
    } else {
      num++;
    }
  }
  throw Error('Could not find available id, tried until ' + prefix + num + '.');
}

export function isSubSchemaDefinedInDefinitions(absolutePath: Path) {
  if (absolutePath.length < 2) {
    return false;
  }
  const parentKey = absolutePath[absolutePath.length - 2];
  return parentKey === '$defs' || parentKey === 'definitions';
}

export function doesSchemaHaveType(
  schema: JsonSchemaType,
  type: SchemaPropertyType,
  mustBeExplicit: boolean = false
): boolean {
  if (schema === undefined) {
    return false;
  }
  if (schema === true) {
    return !mustBeExplicit;
  } else if (schema == false) {
    return false;
  }
  const types = schema.type;
  if (types === undefined) {
    return !mustBeExplicit;
  }

  if (Array.isArray(types) && type.length > 0) {
    return types.includes(type);

    // else: type is actually one string
  } else if (typeof types === 'string') {
    return type === types;
  }
  return false;
}

export function getSchemaTitle(schema: TopLevelJsonSchemaWrapper) {
  return schema.title || 'Untitled schema';
}
