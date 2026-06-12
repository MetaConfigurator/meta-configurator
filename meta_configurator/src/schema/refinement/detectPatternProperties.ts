import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import type {DetectPatternPropertiesOptions} from '@/schema/refinement/refineSchemaTypes';
import {
  collectArrayItemSamples,
  collectObjectSamples,
  collectPropertySamples,
  escapeRegExp,
  inferSchemaFromValues,
  isSchemaObject,
  longestCommonPrefix,
} from '@/schema/refinement/refineSchemaHelpers';

export function detectPatternPropertiesInSchema(
  schema: TopLevelSchema,
  data: unknown,
  options: DetectPatternPropertiesOptions
): TopLevelSchema {
  visitObjectSchemas(schema, [data], options);
  return schema;
}

function visitObjectSchemas(
  schema: JsonSchemaType,
  samples: unknown[],
  options: DetectPatternPropertiesOptions
) {
  if (!isSchemaObject(schema)) {
    return;
  }

  const objectSamples = collectObjectSamples(samples);
  maybeConvertToPatternProperties(schema, objectSamples, options);

  if (schema.properties) {
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      visitObjectSchemas(
        propertySchema,
        collectPropertySamples(objectSamples, propertyName),
        options
      );
    }
  }

  if (schema.patternProperties) {
    for (const [pattern, patternSchema] of Object.entries(schema.patternProperties)) {
      const regex = new RegExp(pattern);
      const patternValues = objectSamples.flatMap(sample =>
        Object.entries(sample)
          .filter(([key]) => regex.test(key))
          .map(([, value]) => value)
      );
      visitObjectSchemas(patternSchema, patternValues, options);
    }
  }

  if (schema.additionalProperties !== undefined) {
    visitObjectSchemas(
      schema.additionalProperties,
      objectSamples.flatMap(sample => Object.values(sample)),
      options
    );
  }

  if (schema.items !== undefined) {
    visitObjectSchemas(schema.items, collectArrayItemSamples(samples), options);
  }

  if (schema.prefixItems) {
    const arraySamples = samples.filter(Array.isArray);
    schema.prefixItems.forEach((prefixSchema, index) => {
      const prefixSamples = arraySamples
        .filter(sample => index < sample.length)
        .map(sample => sample[index]);
      visitObjectSchemas(prefixSchema, prefixSamples, options);
    });
  }
}

function maybeConvertToPatternProperties(
  schema: JsonSchemaObjectType,
  objectSamples: Record<string, unknown>[],
  options: DetectPatternPropertiesOptions
) {
  if (schema.type !== 'object' || !schema.properties) {
    return;
  }

  const propertyNames = Object.keys(schema.properties);
  if (propertyNames.length < options.minMatchingKeys) {
    return;
  }

  const patternResult = detectPattern(propertyNames, options);
  if (patternResult === null) {
    return;
  }

  const propertyValues = propertyNames.flatMap(propertyName =>
    collectPropertySamples(objectSamples, propertyName)
  );
  if (propertyValues.length < options.minMatchingKeys) {
    return;
  }

  schema.patternProperties = {
    ...(schema.patternProperties ?? {}),
    [patternResult]: inferSchemaFromValues(propertyValues),
  };

  delete schema.properties;
  if (schema.required) {
    schema.required = schema.required.filter(
      requiredProperty => !propertyNames.includes(requiredProperty)
    );
    if (schema.required.length === 0) {
      delete schema.required;
    }
  }
}

function detectPattern(
  propertyNames: string[],
  options: DetectPatternPropertiesOptions
): string | null {
  const numericSuffixMatch = propertyNames.map(propertyName => propertyName.match(/^(.*?)(\d+)$/));
  const allHaveNumericSuffix = numericSuffixMatch.every(match => match !== null);
  const numericBases = allHaveNumericSuffix
    ? numericSuffixMatch.map(match => match?.[1] ?? '')
    : [];

  if (allHaveNumericSuffix) {
    const sharedBase = numericBases[0] ?? '';
    const allShareBase = numericBases.every(base => base === sharedBase && base.length > 0);
    if (allShareBase) {
      return `^${escapeRegExp(sharedBase)}[0-9]+$`;
    }
    if (options.requireNumericSuffix) {
      return null;
    }
  } else if (options.requireNumericSuffix) {
    return null;
  }

  const commonPrefix = longestCommonPrefix(propertyNames);
  if (options.requireCommonPrefix && commonPrefix.length === 0) {
    return null;
  }
  if (commonPrefix.length === 0) {
    return null;
  }

  const minKeyLength = Math.min(...propertyNames.map(propertyName => propertyName.length));
  const similarity = minKeyLength === 0 ? 0 : commonPrefix.length / minKeyLength;
  if (similarity < options.similarityThreshold) {
    return null;
  }

  return `^${escapeRegExp(commonPrefix)}.+$`;
}
