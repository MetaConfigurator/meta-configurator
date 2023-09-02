import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
import type {Path} from '@/model/path';
import {useSessionStore} from '@/store/sessionStore';
import {dataAt, pathToString} from '@/helpers/pathHelper';
import _ from 'lodash';

export class EffectiveSchema {
  constructor(public schema: JsonSchema, public data: any, public path: Path) {}

  // TODO get user selected oneOf and anyOf, if none selected, get the ones that
  //  are valid for the current data
}

export function calculateEffectiveSchema(
  schema: JsonSchema | undefined,
  data: any,
  path: Path
): EffectiveSchema {
  let result = schema ?? new JsonSchema({});
  let iteration = 0;

  while (result.isDataDependent && iteration < 1000) {
    // if something goes wrong, we don't want to get stuck in an infinite loop
    if (result.if !== undefined && result.then !== undefined) {
      result = resolveIfThenElse(result, data, path);
    }

    if (result.dependentRequired) {
      result = resolveDependentRequired(result, data);
    }

    if (result.dependentSchemas) {
      result = resolveDependentSchemas(result, data);
    }

    // TODO: resolve the oneOf selection that is currently active,
    //  i.e. the oneOf that is valid for the current data
    //  and the anyOf selections that are currently active

    iteration++;
  }

  return new EffectiveSchema(result, data, path);
}

function resolveDependentRequired(result: JsonSchema, data: any) {
  const newRequired: string[] = result.required;
  for (const [key, value] of Object.entries(result.dependentRequired ?? {})) {
    if (dataAt([key], data) !== undefined) {
      newRequired.push(...value);
    }
  }
  const baseSchema = {...result.jsonSchema};
  delete baseSchema.dependentRequired;

  return new JsonSchema({
    ...baseSchema,
    required: _.union(newRequired),
  });
}

function resolveIfThenElse(result: JsonSchema, data: any, path: Path) {
  let newSchema: JsonSchemaObjectType;
  const validationService = useSessionStore().validationService;
  if (!result.if || !result.if.jsonSchema) {
    return result;
  }
  const valid = validationService.validateSubSchema(
    result.if.jsonSchema,
    pathToString(path) + '.if',
    data
  ).valid;
  const baseSchema = {...result.jsonSchema};
  delete baseSchema.if;
  delete baseSchema.then;
  delete baseSchema.else;

  if (valid) {
    newSchema = {allOf: [baseSchema, result.then?.jsonSchema ?? {}]};
  } else {
    newSchema = {allOf: [baseSchema, result.else?.jsonSchema ?? {}]};
  }
  return new JsonSchema(newSchema);
}

function resolveDependentSchemas(result: JsonSchema, data: any): JsonSchema {
  const schemas = Object.entries(result.dependentSchemas ?? {})
    .filter(([key]) => dataAt([key], data) !== undefined)
    .map(([, value]) => value)
    .map(schema => schema.jsonSchema || {});

  const baseSchema = {...result.jsonSchema};
  delete baseSchema.dependentSchemas;

  const newSchema = {
    allOf: [baseSchema, ...schemas],
  };
  return new JsonSchema(newSchema);
}
