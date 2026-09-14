import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import type {AddExamplesOptions} from '@/schema/refinement/refineSchemaTypes';
import {
  dropExamplesFromFixedValueSchema,
  getSchemaTypes,
  getValueType,
  schemaAllowsValueType,
  uniqueByJsonValue,
  visitSchemaWithSamples,
} from '@/schema/refinement/refineSchemaHelpers';

const EXAMPLE_SUPPORTED_TYPES = new Set(['string', 'integer', 'number', 'boolean']);

export function addExamplesToSchemaFromSamples(
  schema: TopLevelSchema,
  samples: unknown[],
  options: AddExamplesOptions
): TopLevelSchema {
  visitSchemaWithSamples(schema, samples, (schemaNode, samplesForNode) => {
    if (dropExamplesFromFixedValueSchema(schemaNode)) {
      return;
    }

    const schemaTypes = getSchemaTypes(schemaNode);
    if (schemaTypes.length === 0 || !schemaTypes.some(type => EXAMPLE_SUPPORTED_TYPES.has(type))) {
      return;
    }

    const mergedExamples = mergeExamples(
      schemaNode,
      schemaNode.examples ?? [],
      samplesForNode,
      options
    );
    if (mergedExamples.length > 0) {
      schemaNode.examples = mergedExamples;
    }
  });

  return schema;
}

function mergeExamples(
  schemaNode: JsonSchemaObjectType,
  existingExamples: unknown[],
  samples: unknown[],
  options: AddExamplesOptions
): unknown[] {
  const candidateValues = [...existingExamples, ...samples].filter(
    value =>
      canBeUsedAsExample(value, options) && schemaAllowsValueType(schemaNode, getValueType(value))
  );
  const selectedValues = options.uniqueOnly ? uniqueByJsonValue(candidateValues) : candidateValues;
  return selectedValues.slice(0, options.maxExamplesPerField);
}

function canBeUsedAsExample(value: unknown, options: AddExamplesOptions): boolean {
  if (value === null) {
    return !options.ignoreNullValues;
  }
  if (value === '') {
    return !options.ignoreEmptyStrings;
  }
  return EXAMPLE_SUPPORTED_TYPES.has(getValueType(value));
}
