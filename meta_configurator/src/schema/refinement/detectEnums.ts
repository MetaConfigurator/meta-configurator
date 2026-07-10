import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import type {
  DetectEnumsOptions,
  RefineSchemaAllowedType,
} from '@/schema/refinement/refineSchemaTypes';
import {
  collectArrayItemSamples,
  collectObjectSamples,
  collectPropertySamples,
  getMatchingPatternPropertyNames,
  getValueType,
  isSchemaObject,
  schemaAllowsValueType,
} from '@/schema/refinement/refineSchemaHelpers';

export function detectEnumsInSchema(
  schema: TopLevelSchema,
  data: unknown,
  options: DetectEnumsOptions
): TopLevelSchema {
  return detectEnumsInSchemaFromSamples(schema, [data], options);
}

export function detectEnumsInSchemaFromSamples(
  schema: TopLevelSchema,
  samples: unknown[],
  options: DetectEnumsOptions
): TopLevelSchema {
  visitSchemaAndSamples(schema, samples, (schemaNode, samplesForNode) => {
    if (schemaNode.enum || schemaNode.const !== undefined) {
      delete schemaNode.examples;
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

  const uniqueValues: unknown[] = [];
  const seen = new Set<string>();
  for (const sample of samples) {
    const key = JSON.stringify(sample);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueValues.push(sample);
  }

  if (uniqueValues.length > options.maxUniqueValues) {
    return null;
  }

  const duplicateRatio = (samples.length - uniqueValues.length) / samples.length;
  if (duplicateRatio < options.minDuplicateRatio) {
    return null;
  }

  return uniqueValues;
}

function visitSchemaAndSamples(
  schema: JsonSchemaType,
  samples: unknown[],
  visitor: (schemaNode: JsonSchemaObjectType, samples: unknown[]) => void
) {
  if (!isSchemaObject(schema)) {
    return;
  }

  const primitiveSamples = samples.filter(sample => {
    const valueType = getValueType(sample);
    return valueType === 'string' || valueType === 'integer' || valueType === 'boolean';
  });
  visitor(schema, primitiveSamples);

  if (schema.properties) {
    const objectSamples = collectObjectSamples(samples);
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      visitSchemaAndSamples(
        propertySchema,
        collectPropertySamples(objectSamples, propertyName),
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
      visitSchemaAndSamples(patternSchema, patternSamples, visitor);
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
    visitSchemaAndSamples(schema.additionalProperties, additionalPropertySamples, visitor);
  }

  if (schema.items !== undefined) {
    visitSchemaAndSamples(schema.items, collectArrayItemSamples(samples), visitor);
  }

  if (schema.prefixItems) {
    const arraySamples = samples.filter(Array.isArray);
    schema.prefixItems.forEach((prefixSchema, index) => {
      const prefixSamples = arraySamples
        .filter(sample => index < sample.length)
        .map(sample => sample[index]);
      visitSchemaAndSamples(prefixSchema, prefixSamples, visitor);
    });
  }

  for (const schemaList of [schema.allOf, schema.anyOf, schema.oneOf]) {
    schemaList?.forEach(childSchema => visitSchemaAndSamples(childSchema, samples, visitor));
  }

  for (const childSchema of [schema.if, schema.then, schema.else, schema.not, schema.contains]) {
    if (childSchema !== undefined) {
      visitSchemaAndSamples(childSchema, samples, visitor);
    }
  }
}
