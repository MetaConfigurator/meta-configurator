export type RefineSchemaAllowedType = 'string' | 'integer' | 'boolean';

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

export interface DetectPatternPropertiesOptions {
  minMatchingKeys: number;
  requireCommonPrefix: boolean;
  requireNumericSuffix: boolean;
  similarityThreshold: number;
}

export interface RefineSchemaSelection {
  addExamples?: AddExamplesOptions;
  detectEnums?: DetectEnumsOptions;
  detectAdditionalProperties?: DetectAdditionalPropertiesOptions;
  detectPatternProperties?: DetectPatternPropertiesOptions;
}

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

export const DETECT_PATTERN_PROPERTIES_DEFAULTS: DetectPatternPropertiesOptions = {
  minMatchingKeys: 3,
  requireCommonPrefix: true,
  requireNumericSuffix: false,
  similarityThreshold: 0.8,
};
