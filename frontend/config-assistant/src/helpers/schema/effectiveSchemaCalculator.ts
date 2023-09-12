import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
import type {Path} from '@/model/path';
import {useSessionStore} from '@/store/sessionStore';
import {dataAt, pathToString} from '@/helpers/pathHelper';
import _ from 'lodash';
import {safeMergeAllOfs, safeMergeSchemas} from '@/helpers/schema/mergeAllOfs';

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

  console.log('calculate effective schema for ', schema, ' and path ', path);

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

    if (result.oneOf) {
      console.log('hasOneOf');
      result = resolveOneOf(result, path);
    }

    // TODO: resolve the oneOf selection that is currently active,
    //  i.e. the oneOf that is valid for the current data
    //  and the anyOf selections that are currently active

    iteration++;
  }

  return new EffectiveSchema(result, data, path);
}

function resolveOneOf(schemaWrapper: JsonSchema, path: Path) {
  // TODO: remove because not needed. Only do automatic user selection
  const pathAsString = pathToString(path);
  const selectedOneOf = useSessionStore().currentSelectedOneOfOptions.get(pathAsString);
  console.log('selected option for path ', pathAsString, ' is ', selectedOneOf);
  if (selectedOneOf) {
    const baseSchema = {...schemaWrapper.jsonSchema};

    const selectedSubSchema = schemaWrapper.oneOf!![selectedOneOf.index]!!;
    delete baseSchema.oneOf;

    const newSchema = {allOf: [baseSchema, selectedSubSchema.jsonSchema ?? {}]};
    return new JsonSchema(newSchema);
  }

  return schemaWrapper;
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
  let newSchema: JsonSchemaObjectType;
  const validationService = useSessionStore().validationService;
  if (!schemaWrapper.if || !schemaWrapper.if.jsonSchema) {
    return schemaWrapper;
  }
  const valid = validationService.validateSubSchema(
    schemaWrapper.if.jsonSchema,
    pathToString(path) + '.if',
    data
  ).valid;
  const baseSchema = {...schemaWrapper.jsonSchema};
  delete baseSchema.if;
  delete baseSchema.then;
  delete baseSchema.else;

  if (valid) {
    newSchema = {allOf: [baseSchema, schemaWrapper.then?.jsonSchema ?? {}]};
  } else {
    newSchema = {allOf: [baseSchema, schemaWrapper.else?.jsonSchema ?? {}]};
  }
  return new JsonSchema(newSchema);
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
