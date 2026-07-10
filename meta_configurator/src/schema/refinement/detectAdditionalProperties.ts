import type {JsonSchemaObjectType, JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import type {DetectAdditionalPropertiesOptions} from '@/schema/refinement/refineSchemaTypes';
import {
  collectArrayItemSamples,
  collectObjectSamples,
  collectPropertySamples,
  getValueType,
  inferSchemaFromValues,
  isSchemaObject,
} from '@/schema/refinement/refineSchemaHelpers';

export function detectAdditionalPropertiesInSchema(
  schema: TopLevelSchema,
  data: unknown,
  options: DetectAdditionalPropertiesOptions
): TopLevelSchema {
  return detectAdditionalPropertiesInSchemaFromSamples(schema, [data], options);
}

export function detectAdditionalPropertiesInSchemaFromSamples(
  schema: TopLevelSchema,
  samples: unknown[],
  options: DetectAdditionalPropertiesOptions
): TopLevelSchema {
  visitObjectSchemas(schema, samples, options);
  return schema;
}

function visitObjectSchemas(
  schema: JsonSchemaType,
  samples: unknown[],
  options: DetectAdditionalPropertiesOptions
) {
  if (!isSchemaObject(schema)) {
    return;
  }

  const objectSamples = collectObjectSamples(samples);
  maybeConvertToAdditionalProperties(schema, objectSamples, options);

  if (schema.properties) {
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      visitObjectSchemas(
        propertySchema,
        collectPropertySamples(objectSamples, propertyName),
        options
      );
    }
  }

  if (schema.additionalProperties !== undefined) {
    const additionalPropertyValues = objectSamples.flatMap(sample => Object.values(sample));
    visitObjectSchemas(schema.additionalProperties, additionalPropertyValues, options);
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

function maybeConvertToAdditionalProperties(
  schema: JsonSchemaObjectType,
  objectSamples: Record<string, unknown>[],
  options: DetectAdditionalPropertiesOptions
) {
  if (schema.type !== 'object' || !schema.properties || schema.additionalProperties !== undefined) {
    return;
  }

  const propertyNames = Object.keys(schema.properties);
  if (propertyNames.length < options.minProperties) {
    return;
  }

  const propertyValues = propertyNames
    .flatMap(propertyName => collectPropertySamples(objectSamples, propertyName))
    .filter(value => value !== undefined);

  if (propertyValues.length < options.minProperties) {
    return;
  }

  const valueTypes = new Set(propertyValues.map(value => getValueType(value)));
  if (options.requireSameValueType && valueTypes.size !== 1) {
    return;
  }

  if ([...valueTypes].some(type => type === 'null' || type === 'array')) {
    return;
  }

  let similarity = 1;
  if (valueTypes.has('object')) {
    const objectPropertySets = propertyValues
      .filter(
        (value): value is Record<string, unknown> =>
          typeof value === 'object' && value !== null && !Array.isArray(value)
      )
      .map(value => new Set(Object.keys(value)));

    const union = new Set<string>();
    const intersection = new Set<string>(objectPropertySets[0] ? [...objectPropertySets[0]] : []);
    objectPropertySets.forEach(propertySet => {
      propertySet.forEach(key => union.add(key));
      [...intersection].forEach(key => {
        if (!propertySet.has(key)) {
          intersection.delete(key);
        }
      });
    });

    similarity = union.size === 0 ? 1 : intersection.size / union.size;
    if (intersection.size < options.minMatchingSubProperties) {
      return;
    }
  }

  if (similarity < options.similarityThreshold) {
    return;
  }

  schema.additionalProperties = inferSchemaFromValues(propertyValues);
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
