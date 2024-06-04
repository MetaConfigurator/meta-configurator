import {inferSchema} from '@jsonhero/schema-infer';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';

export function inferJsonSchema(sampleData: any): JsonSchemaType {
  return inferSchema(sampleData).toJSONSchema();
}
