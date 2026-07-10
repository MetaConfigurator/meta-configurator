export type RefineSchemaAllowedType = 'string' | 'integer' | 'boolean';

export type SortSchemaPropertiesOptions = Record<string, never>;

export interface AddExamplesOptions {
  maxExamplesPerField: number;
  uniqueOnly: boolean;
  ignoreNullValues: boolean;
}

export interface DetectEnumsOptions {
  minObservedValues: number;
  minDuplicateRatio: number;
  maxUniqueValues: number;
  allowedTypes: RefineSchemaAllowedType[];
}

export interface DetectAdditionalPropertiesOptions {
  minProperties: number;
  similarityThreshold: number;
  minMatchingSubProperties: number;
  requireSameValueType: boolean;
}

export interface ExtractSubSchemasIntoReferencesOptions {
  extractRootElement: boolean;
  extractEnums: boolean;
}

export interface RefineSchemaSelection {
  sortSchemaPropertiesAlphabetically?: SortSchemaPropertiesOptions;
  addExamples?: AddExamplesOptions;
  detectEnums?: DetectEnumsOptions;
  detectAdditionalProperties?: DetectAdditionalPropertiesOptions;
  extractSubSchemasIntoReferences?: ExtractSubSchemasIntoReferencesOptions;
}

export const SORT_SCHEMA_PROPERTIES_DEFAULTS: SortSchemaPropertiesOptions = {};

export const ADD_EXAMPLES_DEFAULTS: AddExamplesOptions = {
  maxExamplesPerField: 4,
  uniqueOnly: true,
  ignoreNullValues: true,
};

export const DETECT_ENUMS_DEFAULTS: DetectEnumsOptions = {
  minObservedValues: 4,
  minDuplicateRatio: 0.2,
  maxUniqueValues: 20,
  allowedTypes: ['string', 'integer', 'boolean'],
};

export const DETECT_ADDITIONAL_PROPERTIES_DEFAULTS: DetectAdditionalPropertiesOptions = {
  minProperties: 3,
  similarityThreshold: 0.8,
  minMatchingSubProperties: 2,
  requireSameValueType: true,
};

export const EXTRACT_SUB_SCHEMAS_INTO_REFERENCES_DEFAULTS: ExtractSubSchemasIntoReferencesOptions = {
  extractRootElement: false,
  extractEnums: true,
};
