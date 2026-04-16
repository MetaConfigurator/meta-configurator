export type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'object'
  | 'array'
  | 'boolean'
  | 'null';

const COMMON = ['title', 'description', 'default', 'examples', 'enum', 'const'];

const GENERIC = ['allOf', 'anyOf', 'oneOf', 'not'];

export const SUPPORTED_KEYWORDS: Record<JsonSchemaType, string[]> = {
  string: [...COMMON, ...GENERIC, 'minLength', 'maxLength', 'pattern', 'format'],
  number: [
    ...COMMON,
    ...GENERIC,
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'multipleOf',
  ],
  integer: [
    ...COMMON,
    ...GENERIC,
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'multipleOf',
  ],
  object: [...COMMON, ...GENERIC, 'properties', 'required', 'additionalProperties'],
  array: [...COMMON, ...GENERIC, 'items', 'minItems', 'maxItems', 'uniqueItems'],
  boolean: [...COMMON, ...GENERIC],
  null: [...COMMON, ...GENERIC],
};
