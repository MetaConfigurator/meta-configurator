import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import type {
  DetectEnumsOptions,
  RefineSchemaAllowedType,
} from '@/schema/refinement/refineSchemaTypes';
import {
  dropExamplesFromFixedValueSchema,
  getValueType,
  schemaAllowsValueType,
  uniqueByJsonValue,
  visitSchemaWithSamples,
} from '@/schema/refinement/refineSchemaHelpers';

export function detectEnumsInSchemaFromSamples(
  schema: TopLevelSchema,
  samples: unknown[],
  options: DetectEnumsOptions
): TopLevelSchema {
  visitSchemaWithSamples(schema, samples, (schemaNode, samplesForNode) => {
    if (dropExamplesFromFixedValueSchema(schemaNode)) {
      return;
    }

    const enumValues = detectEnumValues(schemaNode, samplesForNode, options);
    if (enumValues !== null) {
      schemaNode.enum = enumValues;
      delete schemaNode.examples;
    }
  });

  return schema;
}

/**
 * Returns the enum values the samples justify, or null when they look too varied,
 * too few, too repetitive-free or of a type the schema or the options do not allow.
 */
function detectEnumValues(
  schemaNode: JsonSchemaObjectType,
  samples: unknown[],
  options: DetectEnumsOptions
): unknown[] | null {
  if (samples.length < options.minObservedValues) {
    return null;
  }

  const observedTypes = new Set(samples.map(sample => getValueType(sample)));
  if (observedTypes.size !== 1) {
    return null;
  }

  const observedType = [...observedTypes][0] as RefineSchemaAllowedType | undefined;
  if (!observedType || !options.allowedTypes.includes(observedType)) {
    return null;
  }
  if (!schemaAllowsValueType(schemaNode, observedType)) {
    return null;
  }

  const uniqueValues = uniqueByJsonValue(samples);
  if (uniqueValues.length > options.maxUniqueValues) {
    return null;
  }

  const duplicateRatio = (samples.length - uniqueValues.length) / samples.length;
  if (duplicateRatio < options.minDuplicateRatio) {
    return null;
  }

  return uniqueValues;
}
