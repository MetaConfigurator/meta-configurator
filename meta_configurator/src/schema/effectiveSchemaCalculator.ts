import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {Path} from '@/utility/path';
import _ from 'lodash';
import {useValidationService} from '@/schema/validation/useValidation';
import {dataAt} from '@/utility/resolveDataAtPath';
import {useCurrentSchema} from '@/data/useDataLink';

/**
 * Wrapper around a schema and the data it was calculated for.
 */
export class EffectiveSchema {
  constructor(public schema: JsonSchemaWrapper, public data: any, public path: Path) {}
}

/**
 * Calculates the effective schema for the given data.
 * The effective schema is the schema that results from resolving all data dependent keywords.
 *
 * The following keywords are supported:
 * - if/then/else
 * - dependentRequired
 * - dependentSchemas
 *
 * @param schema the schema to calculate the effective schema for
 * @param data the data to calculate the effective schema for
 * @param path the path to the data
 * @returns the effective schema
 */
export function calculateEffectiveSchema(
  schema: JsonSchemaWrapper | undefined,
  data: any,
  path: Path
): EffectiveSchema {
  let result =
    schema ?? new JsonSchemaWrapper({}, useCurrentSchema().schemaPreprocessed.value, false);
  let iteration = 0;

  while (result.isDataDependent && iteration < 1000) {
    // if something goes wrong, we don't want to get stuck in an infinite loop
    if (result.if !== undefined) {
      result = resolveIfThenElse(result, data);
    }

    if (result.dependentRequired) {
      result = resolveDependentRequired(result, data);
    }

    if (result.dependentSchemas) {
      result = resolveDependentSchemas(result, data);
    }

    if (result.conditions && result.conditions.length > 0) {
      result = resolveConditions(result, data);
    }

    iteration++;
  }

  return new EffectiveSchema(result, data, path);
}

function resolveDependentRequired(schemaWrapper: JsonSchemaWrapper, data: any) {
  // new required = required + dependentRequired

  const newRequired: string[] = schemaWrapper.required;

  for (const [key, value] of Object.entries(schemaWrapper.dependentRequired ?? {})) {
    if (dataAt([key], data) !== undefined) {
      // data is present --> add dependent required
      newRequired.push(...value);
    }
  }
  const baseSchema = {...schemaWrapper.jsonSchema};
  delete baseSchema.dependentRequired;

  return new JsonSchemaWrapper(
    {
      ...baseSchema,
      required: _.union(newRequired),
    },
    useCurrentSchema().schemaPreprocessed.value
  );
}

function resolveIfThenElse(schemaWrapper: JsonSchemaWrapper, data: any) {
  if (!schemaWrapper.if || !schemaWrapper.if.jsonSchema) {
    return schemaWrapper;
  }

  const validationService = useValidationService();
  const valid = validationService.validateSubSchema(schemaWrapper.if.jsonSchema, data).valid;

  const baseSchema = {...schemaWrapper.jsonSchema};
  delete baseSchema.if;
  delete baseSchema.then;
  delete baseSchema.else;

  const thenSchema = schemaWrapper.then?.jsonSchema ?? {};
  const elseSchema = schemaWrapper.else?.jsonSchema ?? {};

  const newSchema = {allOf: [baseSchema, valid ? thenSchema : elseSchema]};
  return new JsonSchemaWrapper(newSchema, useCurrentSchema().schemaPreprocessed.value);
}

function resolveConditions(result: JsonSchemaWrapper, data: any) {
  const resolvedConditions = result.conditions?.map(condition => {
    return resolveIfThenElse(condition, data);
  });
  const baseSchema = {...result.jsonSchema};
  delete baseSchema.conditions;

  const newSchema = {
    allOf: [
      baseSchema,
      ...(resolvedConditions?.map(condition => condition.jsonSchema ?? {}) ?? []),
    ],
  };
  return new JsonSchemaWrapper(newSchema, useCurrentSchema().schemaPreprocessed.value);
}

function resolveDependentSchemas(schemaWrapper: JsonSchemaWrapper, data: any): JsonSchemaWrapper {
  const dependentSchemas = Object.entries(schemaWrapper.dependentSchemas ?? {})
    // data is present --> add dependent schema
    .filter(([key]) => dataAt([key], data) !== undefined)
    // get the schema
    .map(([, value]) => value)
    .map(schema => schema.jsonSchema || {});

  const baseSchema = {...schemaWrapper.jsonSchema};
  delete baseSchema.dependentSchemas;

  const newSchema = {
    allOf: [baseSchema, ...dependentSchemas],
  };
  return new JsonSchemaWrapper(newSchema, useCurrentSchema().schemaPreprocessed);
}
