import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import {inferSchema} from '@jsonhero/schema-infer';

export function isSchemaObject(schema: JsonSchemaType): schema is JsonSchemaObjectType {
  return typeof schema === 'object' && schema !== null;
}

export function getValueType(value: unknown):
  | 'null'
  | 'array'
  | 'boolean'
  | 'integer'
  | 'number'
  | 'object'
  | 'string' {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  switch (typeof value) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return Number.isInteger(value) ? 'integer' : 'number';
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    default:
      return 'string';
  }
}

export function getSchemaTypes(schema: JsonSchemaObjectType): string[] {
  if (schema.type === undefined) {
    return [];
  }
  if (Array.isArray(schema.type)) {
    return schema.type;
  }
  return [schema.type];
}

export function schemaAllowsValueType(schema: JsonSchemaObjectType, valueType: string): boolean {
  const schemaTypes = getSchemaTypes(schema);
  if (schemaTypes.length === 0) {
    return true;
  }
  if (schemaTypes.includes(valueType)) {
    return true;
  }
  return valueType === 'integer' && schemaTypes.includes('number');
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function longestCommonPrefix(values: string[]): string {
  if (values.length === 0) {
    return '';
  }
  let prefix = values[0] ?? '';
  for (let index = 1; index < values.length; index++) {
    const current = values[index] ?? '';
    while (!current.startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
    if (prefix.length === 0) {
      break;
    }
  }
  return prefix;
}

export function getMatchingPatternPropertyNames(
  keys: string[],
  patternProperties: Record<string, JsonSchemaType> | undefined
): Set<string> {
  const matchingKeys = new Set<string>();
  if (!patternProperties) {
    return matchingKeys;
  }

  for (const pattern of Object.keys(patternProperties)) {
    const regex = new RegExp(pattern);
    for (const key of keys) {
      if (regex.test(key)) {
        matchingKeys.add(key);
      }
    }
  }

  return matchingKeys;
}

export function collectObjectSamples(samples: unknown[]): Record<string, unknown>[] {
  return samples.filter(
    (sample): sample is Record<string, unknown> =>
      typeof sample === 'object' && sample !== null && !Array.isArray(sample)
  );
}

export function collectArrayItemSamples(samples: unknown[]): unknown[] {
  return samples.flatMap(sample => (Array.isArray(sample) ? sample : []));
}

export function inferSchemaFromValues(values: unknown[]): JsonSchemaType {
  if (values.length === 0) {
    return true;
  }

  const inferredArraySchema = fixEmptyArraySchemas(inferSchema(values).toJSONSchema());
  if (isSchemaObject(inferredArraySchema) && inferredArraySchema.type === 'array') {
    return inferredArraySchema.items ?? true;
  }
  return inferredArraySchema;
}

function fixEmptyArraySchemas(schema: JsonSchemaType): JsonSchemaType {
  if (!isSchemaObject(schema)) {
    return schema;
  }

  if (schema.type === 'array' && schema.items === false) {
    schema.items = true;
  }

  for (const key of Object.keys(schema)) {
    const value = schema[key];
    if (Array.isArray(value)) {
      schema[key] = value.map(element =>
        isSchemaObject(element) || typeof element === 'boolean' ? fixEmptyArraySchemas(element) : element
      );
    } else if (isSchemaObject(value) || typeof value === 'boolean') {
      schema[key] = fixEmptyArraySchemas(value);
    }
  }

  return schema;
}

export function collectPropertySamples(
  objectSamples: Record<string, unknown>[],
  propertyName: string
): unknown[] {
  return objectSamples
    .filter(sample => propertyName in sample)
    .map(sample => sample[propertyName]);
}
