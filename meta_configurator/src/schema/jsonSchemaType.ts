/* eslint-disable */
/**
 * This file represents the type for JSON Schema, 2020-12 draft.
 * Note that this was partially generated using a JSON Schema to TypeScript converter,
 * but manual modifications were necessary as the generator does not support all JSON Schema features.
 */
export type JsonSchemaType = boolean | JsonSchemaObjectType;

/**
 * Used to distinguish between preprocessed and non-preprocessed schemas.
 */
export type JsonSchemaTypePreprocessed = JsonSchemaType & {
  $preprocessed: true;
};

export type JsonSchemaObjectType = {
  $ref?: string;
  $anchor?: string;
  $dynamicRef?: string;
  $dynamicAnchor?: string;
  $comment?: string;
  /**
   * @minItems 1
   */
  prefixItems?: JsonSchemaType[];
  items?: JsonSchemaType;
  contains?: JsonSchemaType;
  additionalProperties?: JsonSchemaType;
  properties?: {
    [k: string]: JsonSchemaType;
  };
  patternProperties?: {
    [k: string]: JsonSchemaType;
  };
  dependentSchemas?: {
    [k: string]: JsonSchemaType;
  };
  propertyNames?: JsonSchemaType;
  if?: JsonSchemaType;
  then?: JsonSchemaType;
  else?: JsonSchemaType;
  /**
   * @minItems 1
   */
  allOf?: JsonSchemaType[];
  /**
   * @minItems 1
   */
  anyOf?: JsonSchemaType[];
  /**
   * @minItems 1
   */
  oneOf?: JsonSchemaType[];
  not?: JsonSchemaType;
  unevaluatedItems?: JsonSchemaType;
  unevaluatedProperties?: JsonSchemaType;
  type?: SchemaPropertyTypes;
  const?: unknown;
  enum?: unknown[];
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxContains?: number;
  minContains?: number;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  dependentRequired?: {
    [k: string]: string[];
  };
  title?: string;
  description?: string;
  default?: unknown;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: unknown[];
  format?: string;
  contentEncoding?: string;
  contentMediaType?: string;
  contentSchema?: JsonSchemaType;
  dependencies?: {
    [k: string]: JsonSchemaType | string[];
  };
  $recursiveAnchor?: string;
  $recursiveRef?: string;
  metaConfigurator?: {
    hideAddPropertyButton?: boolean;
    advanced?: boolean;
    ontology?: {mustBeUri?: boolean; mustBeClassOrProperty?: boolean};
  };

  [k: string]: any;
};
export type TopLevelSchema = JsonSchemaType & {
  $schema?: string;
  $id?: string;
  $vocabulary?: {
    [k: string]: boolean;
  };
  $defs?: {
    [k: string]: JsonSchemaType;
  };
  definitions?: {
    [k: string]: JsonSchemaType;
  };
};

export type SchemaPropertyType =
  | 'array'
  | 'boolean'
  | 'integer'
  | 'null'
  | 'number'
  | 'object'
  | 'string';

/**
 * All possible types for a JSON Schema property.
 */
export const SCHEMA_PROPERTY_TYPES: SchemaPropertyType[] = [
  'array',
  'boolean',
  'integer',
  'null',
  'number',
  'object',
  'string',
];
export const NUMBER_OF_PROPERTY_TYPES = SCHEMA_PROPERTY_TYPES.length;
export type SchemaPropertyTypes = SchemaPropertyType | SchemaPropertyType[];
