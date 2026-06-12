import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import type {AddExamplesOptions} from '@/schema/refinement/refineSchemaTypes';
import {
  collectArrayItemSamples,
  collectObjectSamples,
  collectPropertySamples,
  getMatchingPatternPropertyNames,
  getSchemaTypes,
  getValueType,
  isSchemaObject,
} from '@/schema/refinement/refineSchemaHelpers';

const EXAMPLE_SUPPORTED_TYPES = new Set(['string', 'integer', 'number', 'boolean']);

export function addExamplesToSchema(
  schema: TopLevelSchema,
  data: unknown,
  options: AddExamplesOptions
): TopLevelSchema {
  visitSchemaAndSamples(schema, [data], options, (schemaNode, samples) => {
    const schemaTypes = getSchemaTypes(schemaNode);
    if (schemaTypes.length === 0 || schemaTypes.some(type => !EXAMPLE_SUPPORTED_TYPES.has(type))) {
      return;
    }

    const mergedExamples = mergeExamples(schemaNode.examples ?? [], samples, options);
    if (mergedExamples.length > 0) {
      schemaNode.examples = mergedExamples;
    }
  });

  return schema;
}

function mergeExamples(
  existingExamples: unknown[],
  samples: unknown[],
  options: AddExamplesOptions
): unknown[] {
  const sanitized: unknown[] = [];
  const seen = new Set<string>();

  for (const example of [...existingExamples, ...samples]) {
    if (!shouldIncludeValue(example, options)) {
      continue;
    }
    const key = JSON.stringify(example);
    if (options.uniqueOnly && seen.has(key)) {
      continue;
    }
    seen.add(key);
    sanitized.push(example);
    if (sanitized.length >= options.maxExamplesPerField) {
      return sanitized;
    }
  }

  return sanitized;
}

function shouldIncludeValue(value: unknown, options: AddExamplesOptions): boolean {
  if (value === null && options.ignoreNullValues) {
    return false;
  }
  if (value === null) {
    return true;
  }
  return EXAMPLE_SUPPORTED_TYPES.has(getValueType(value));
}

function visitSchemaAndSamples(
  schema: JsonSchemaType,
  samples: unknown[],
  options: AddExamplesOptions,
  visitor: (schemaNode: JsonSchemaObjectType, samples: unknown[]) => void
) {
  if (!isSchemaObject(schema)) {
    return;
  }

  visitor(schema, samples.filter(sample => shouldIncludeValue(sample, options)));

  if (schema.properties) {
    const objectSamples = collectObjectSamples(samples);
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      visitSchemaAndSamples(
        propertySchema,
        collectPropertySamples(objectSamples, propertyName),
        options,
        visitor
      );
    }
  }

  if (schema.patternProperties) {
    const objectSamples = collectObjectSamples(samples);
    for (const [pattern, patternSchema] of Object.entries(schema.patternProperties)) {
      const regex = new RegExp(pattern);
      const patternSamples = objectSamples.flatMap(sample =>
        Object.entries(sample)
          .filter(([key]) => regex.test(key))
          .map(([, value]) => value)
      );
      visitSchemaAndSamples(patternSchema, patternSamples, options, visitor);
    }
  }

  if (schema.additionalProperties !== undefined) {
    const objectSamples = collectObjectSamples(samples);
    const explicitProperties = new Set(Object.keys(schema.properties ?? {}));
    const additionalPropertySamples = objectSamples.flatMap(sample => {
      const matchingPatternPropertyNames = getMatchingPatternPropertyNames(
        Object.keys(sample),
        schema.patternProperties
      );
      return Object.entries(sample)
        .filter(([key]) => !explicitProperties.has(key) && !matchingPatternPropertyNames.has(key))
        .map(([, value]) => value);
    });
    visitSchemaAndSamples(schema.additionalProperties, additionalPropertySamples, options, visitor);
  }

  if (schema.items !== undefined) {
    visitSchemaAndSamples(schema.items, collectArrayItemSamples(samples), options, visitor);
  }

  if (schema.prefixItems) {
    const arraySamples = samples.filter(Array.isArray);
    schema.prefixItems.forEach((prefixSchema, index) => {
      const prefixSamples = arraySamples
        .filter(sample => index < sample.length)
        .map(sample => sample[index]);
      visitSchemaAndSamples(prefixSchema, prefixSamples, options, visitor);
    });
  }

  for (const schemaList of [schema.allOf, schema.anyOf, schema.oneOf]) {
    schemaList?.forEach(childSchema => visitSchemaAndSamples(childSchema, samples, options, visitor));
  }

  for (const childSchema of [schema.if, schema.then, schema.else, schema.not, schema.contains]) {
    if (childSchema !== undefined) {
      visitSchemaAndSamples(childSchema, samples, options, visitor);
    }
  }
}
