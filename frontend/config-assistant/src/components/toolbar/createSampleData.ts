import {JSONSchemaFaker} from 'json-schema-faker';

export async function generateSampleData(schema: any): Promise<any> {
  JSONSchemaFaker.option('alwaysFakeOptionals', true);
  JSONSchemaFaker.option('minItems', 1);
  JSONSchemaFaker.option('failOnInvalidFormat', false);
  return JSONSchemaFaker.resolve(schema);
}
