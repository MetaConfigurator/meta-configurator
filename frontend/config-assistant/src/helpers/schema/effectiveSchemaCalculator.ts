import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
import type {Path} from '@/model/path';
import {useSessionStore} from '@/store/sessionStore';
import {dataAt, pathToString} from '@/helpers/pathHelper';
import _ from 'lodash';

export class EffectiveSchema {
  constructor(public schema: JsonSchema, public data: any, public path: Path) {}
}

export function calculateEffectiveSchema(
  schema: JsonSchema | undefined,
  data: any,
  path: Path
): EffectiveSchema {
  let result = schema ?? new JsonSchema({});
  let iteration = 0;

  console.groupCollapsed('calculateEffectiveSchema', pathToString(path));
  console.log('schema', schema);

  while (result.isDataDependent && iteration < 1000) {
    // if something goes wrong, we don't want to get stuck in an infinite loop
    if (result.if !== undefined && result.then !== undefined) {
      result = resolveIfThenElse(result, data, path);
      console.log('resolved if then else', result);
    }

    if (result.dependentRequired) {
      result = resolveDependentRequired(result, data);
      console.log('resolved dependentRequired', result);
    }

    if (result.dependentSchemas) {
      result = resolveDependentSchemas(result, data);
      console.log('resolved dependentSchemas', result);
    }

    if (result.conditions && result.conditions.length > 0) {
      result = resolveConditions(result, data, path);
      console.log('resolved conditions', result);
    }

    iteration++;
  }

  console.groupEnd();

  return new EffectiveSchema(result, data, path);
}

function resolveDependentRequired(schemaWrapper: JsonSchema, data: any) {
  const newRequired: string[] = schemaWrapper.required;
  for (const [key, value] of Object.entries(schemaWrapper.dependentRequired ?? {})) {
    if (dataAt([key], data) !== undefined) {
      newRequired.push(...value);
    }
  }
  const baseSchema = {...schemaWrapper.jsonSchema};
  delete baseSchema.dependentRequired;

  return new JsonSchema({
    ...baseSchema,
    required: _.union(newRequired),
  });
}

function resolveIfThenElse(schemaWrapper: JsonSchema, data: any, path: Path) {
  console.groupCollapsed('resolveIfThenElse');
  let newSchema: JsonSchemaObjectType;
  const validationService = useSessionStore().validationService;
  if (!schemaWrapper.if || !schemaWrapper.if.jsonSchema) {
    return schemaWrapper;
  }
  const valid = validationService.validateSubSchema(schemaWrapper.if.jsonSchema, data).valid;
  const baseSchema = {...schemaWrapper.jsonSchema};
  delete baseSchema.if;
  delete baseSchema.then;
  delete baseSchema.else;

  if (valid) {
    console.log('valid');
    newSchema = {allOf: [baseSchema, schemaWrapper.then?.jsonSchema ?? {}]};
  } else {
    console.log('invalid');
    newSchema = {allOf: [baseSchema, schemaWrapper.else?.jsonSchema ?? {}]};
  }
  console.log('newSchema', newSchema);
  const result = new JsonSchema(newSchema);
  console.groupEnd();
  return result;
}

function resolveConditions(result: JsonSchema, data: any, path: Path) {
  console.groupCollapsed('resolveConditions for', result);
  const resolvedConditions = result.conditions?.map(condition => {
    return resolveIfThenElse(condition, data, path);
  });
  console.log('resolvedConditions', resolvedConditions);
  const baseSchema = {...result.jsonSchema};
  delete baseSchema.conditions;

  const newSchema = {
    allOf: [
      baseSchema,
      ...(resolvedConditions?.map(condition => condition.jsonSchema ?? {}) ?? []),
    ],
  };
  console.log('newSchema', newSchema);
  const nresult = new JsonSchema(newSchema);
  console.groupEnd();
  return nresult;
}

function resolveDependentSchemas(schemaWrapper: JsonSchema, data: any): JsonSchema {
  const schemas = Object.entries(schemaWrapper.dependentSchemas ?? {})
    .filter(([key]) => dataAt([key], data) !== undefined)
    .map(([, value]) => value)
    .map(schema => schema.jsonSchema || {});

  const baseSchema = {...schemaWrapper.jsonSchema};
  delete baseSchema.dependentSchemas;

  const newSchema = {
    allOf: [baseSchema, ...schemas],
  };
  return new JsonSchema(newSchema);
}
