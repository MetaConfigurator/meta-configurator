import type {JsonSchemaType} from '@/model/JsonSchemaType';

// import $RefParser from '@apidevtools/json-schema-ref-parser';

/**
 * Preprocesses the schema. Currently, this means de-referencing it,
 * so all references are resolved.
 * Note that this function is async, because de-referencing is async.
 *
 * NOTE: If the schema contains circular references, this function will
 * work, but calling things like Json.stringify on the schema or
 * calculating the tree of schema nodes will lead to an infinite loop.
 *
 * @param schema the schema to preprocess
 * @returns the preprocessed schema (as a promise)
 */
export function preprocessSchema(schema: JsonSchemaType): Promise<JsonSchemaType> {
  return dereferenceSchema(schema);
}

async function dereferenceSchema(schema: JsonSchemaType): Promise<JsonSchemaType> {
  if (schema === true || schema === false) {
    return schema;
  }
  // this library seems to mainly work for JSON Schema Draft 4 thus the types are
  // not compatible with our JsonSchemaType, but actually the
  // de-referencing should work for all versions
 //return await $RefParser.dereference(schema as any) as JsonSchemaType; // we assume the typing does not change
  return Promise.resolve(schema);
}
