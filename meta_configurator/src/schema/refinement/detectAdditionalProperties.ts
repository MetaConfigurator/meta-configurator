import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import type {DetectAdditionalPropertiesOptions} from '@/schema/refinement/refineSchemaTypes';
import {
  collectObjectSamples,
  collectPropertySamples,
  getValueType,
  inferSchemaFromValues,
  visitSchemaWithSamples,
} from '@/schema/refinement/refineSchemaHelpers';

export function detectAdditionalPropertiesInSchemaFromSamples(
  schema: TopLevelSchema,
  samples: unknown[],
  options: DetectAdditionalPropertiesOptions
): TopLevelSchema {
  visitSchemaWithSamples(schema, samples, (schemaNode, samplesForNode) => {
    maybeConvertPropertiesToAdditionalProperties(
      schemaNode,
      collectObjectSamples(samplesForNode),
      options
    );
  });

  return schema;
}

/**
 * Replaces the listed properties of a map-like object by a single additionalProperties
 * schema, so that a schema inferred from one sample does not hard-code its keys.
 */
function maybeConvertPropertiesToAdditionalProperties(
  schema: JsonSchemaObjectType,
  objectSamples: Record<string, unknown>[],
  options: DetectAdditionalPropertiesOptions
): void {
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
  if (!arePropertyValuesInterchangeable(propertyValues, options)) {
    return;
  }

  schema.additionalProperties = inferSchemaFromValues(propertyValues);
  delete schema.properties;
  removeConvertedPropertiesFromRequired(schema, propertyNames);
}

/** Map entries look alike: same value type, and for objects a shared enough key set. */
function arePropertyValuesInterchangeable(
  propertyValues: unknown[],
  options: DetectAdditionalPropertiesOptions
): boolean {
  const valueTypes = new Set(propertyValues.map(value => getValueType(value)));
  if (options.requireSameValueType && valueTypes.size !== 1) {
    return false;
  }
  if (valueTypes.has('null') || valueTypes.has('array')) {
    return false;
  }
  if (!valueTypes.has('object')) {
    return true;
  }

  const {sharedKeyCount, keySetSimilarity} = compareObjectKeySets(propertyValues);
  return (
    sharedKeyCount >= options.minMatchingSubProperties &&
    keySetSimilarity >= options.similarityThreshold
  );
}

/** How many keys all object values share, and that count relative to all keys seen. */
function compareObjectKeySets(values: unknown[]): {
  sharedKeyCount: number;
  keySetSimilarity: number;
} {
  const keySets = values
    .filter(value => getValueType(value) === 'object')
    .map(value => new Set(Object.keys(value as Record<string, unknown>)));

  const sharedKeys = new Set(keySets[0] ?? []);
  const allKeys = new Set<string>();
  for (const keySet of keySets) {
    keySet.forEach(key => allKeys.add(key));
    sharedKeys.forEach(key => {
      if (!keySet.has(key)) {
        sharedKeys.delete(key);
      }
    });
  }

  return {
    sharedKeyCount: sharedKeys.size,
    keySetSimilarity: allKeys.size === 0 ? 1 : sharedKeys.size / allKeys.size,
  };
}

function removeConvertedPropertiesFromRequired(
  schema: JsonSchemaObjectType,
  convertedPropertyNames: string[]
): void {
  if (!schema.required) {
    return;
  }

  schema.required = schema.required.filter(
    requiredProperty => !convertedPropertyNames.includes(requiredProperty)
  );
  if (schema.required.length === 0) {
    delete schema.required;
  }
}
