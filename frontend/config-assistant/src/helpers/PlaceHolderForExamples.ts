import {JsonSchema} from '@/helpers/schema/JsonSchema';

export function placeHolderValue(schema: JsonSchema) {
  return schema.examples && schema.examples.length > 0
    ? `Possible Examples: ${schema.examples}`
    : '';
}
