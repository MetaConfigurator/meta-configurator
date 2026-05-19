import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import {safeMergeSchemas} from '@/schema/mergeAllOfs';
import type {SessionMode} from '@/store/sessionMode';
import _ from 'lodash';

export function shouldShowCompositionSelection(
  schema: JsonSchemaWrapper,
  subSchemas: JsonSchemaWrapper[],
  compositionKeyword: 'oneOf' | 'anyOf',
  mode: SessionMode
): boolean {
  const guiSchemas = subSchemas
    .map(subSchema =>
      representativeCompositionSchema(schema, [subSchema], compositionKeyword, mode)
    )
    .map(mergedSchema => stripValidationOnlyFieldsForGui(mergedSchema?.jsonSchema))
    .filter(normalizedSchema => normalizedSchema !== undefined);

  if (guiSchemas.length !== subSchemas.length) {
    return true;
  }

  return !guiSchemas.every(normalizedSchema => _.isEqual(normalizedSchema, guiSchemas[0]));
}

export function representativeCompositionSchema(
  schema: JsonSchemaWrapper,
  subSchemas: JsonSchemaWrapper[],
  compositionKeyword: 'oneOf' | 'anyOf',
  mode: SessionMode
): JsonSchemaWrapper | undefined {
  const baseSchema = {...schema.jsonSchema};
  delete baseSchema[compositionKeyword];
  const representative = subSchemas[0]?.jsonSchema;
  if (!representative) {
    return undefined;
  }
  const mergedSchema = safeMergeSchemas(baseSchema, representative);
  if (mergedSchema === false) {
    return undefined;
  }
  return new JsonSchemaWrapper(mergedSchema, mode, false);
}

export function stripValidationOnlyFieldsForGui(schema: JsonSchemaType): JsonSchemaType {
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(item => stripValidationOnlyFieldsForGui(item));
  }

  const stripped: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (GUI_IRRELEVANT_SCHEMA_FIELDS.has(key)) {
      continue;
    }
    stripped[key] = stripValidationOnlyFieldsForGui(value as JsonSchemaType);
  }
  return stripped;
}

const GUI_IRRELEVANT_SCHEMA_FIELDS = new Set([
  '$anchor',
  '$comment',
  '$dynamicAnchor',
  '$dynamicRef',
  '$id',
  '$recursiveAnchor',
  '$recursiveRef',
  '$schema',
  'contentEncoding',
  'contentMediaType',
  'default',
  'deprecated',
  'description',
  'examples',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'id',
  'maxContains',
  'maximum',
  'maxItems',
  'maxLength',
  'maxProperties',
  'minContains',
  'minimum',
  'minItems',
  'minLength',
  'minProperties',
  'multipleOf',
  'pattern',
  'readOnly',
  'title',
  'uniqueItems',
  'writeOnly',
]);
