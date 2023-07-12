import {JSONSchemaFaker} from 'json-schema-faker';

export function generateSampleData(schema: any): any {
  JSONSchemaFaker.option('alwaysFakeOptionals', true);
  JSONSchemaFaker.option('minItems', 1);
  JSONSchemaFaker.option('failOnInvalidFormat', false);
  return JSONSchemaFaker.generate(schema);
}
