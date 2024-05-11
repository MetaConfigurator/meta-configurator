import type {JsonSchemaObjectType} from '@/schema/jsonSchemaType';
import {NUMBER_OF_PROPERTY_TYPES} from '@/schema/jsonSchemaType';

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
