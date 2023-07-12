import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
// @ts-ignore
import mergeAllOf from 'json-schema-merge-allof';
import pointer from 'json-pointer';
import {useSessionStore} from '@/store/sessionStore';
import {nonBooleanSchema} from '@/helpers/schema/SchemaUtils';

/**
 * Preprocesses the schema.
 *
 * @param schema the schema to preprocess
 * @returns the preprocessed schema
 */
export function preprocessSchema(schema: JsonSchemaObjectType): JsonSchemaObjectType {
  // TODO: resolve refs once at the beginning using json-schema-ref-parser
  // this is technically possible because the json schema faker also uses json-schema-ref-parser
  // and it works there
  // so we have to find a way to make it work here as well
  if (hasRef(schema)) {
    // remove leading # from ref if present
    const refString = schema.$ref?.startsWith('#') ? schema.$ref.substring(1) : schema.$ref!!;
    let refSchema = pointer.get(
      nonBooleanSchema(useSessionStore().fileSchemaObject ?? {}) ?? {},
      refString
    );
    refSchema = preprocessSchema(refSchema);
    delete schema.$ref;
    schema = {allOf: [schema, refSchema]};
  }

  if (hasAllOfs(schema)) {
    // @ts-ignore
    schema.allOf = schema.allOf!!.map(preprocessSchema);
    schema = mergeAllOf(schema);
  }

  return schema;
}

function hasRef(schema: JsonSchemaObjectType): boolean {
  return schema.$ref !== undefined;
}

function hasAllOfs(schema: JsonSchemaObjectType): boolean {
  return schema.allOf !== undefined && schema.allOf.length > 0;
}
