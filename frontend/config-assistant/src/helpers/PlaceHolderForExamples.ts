import {JsonSchema} from '@/helpers/schema/JsonSchema';

export function placeHolderValue(schema: JsonSchema) {
  if (schema.examples && schema.examples.length == 1) {
    return `Possible Example: ${schema.examples}`;
  } else if (schema.examples && schema.examples.length > 1) {
    return `Possible Example: ${schema.examples}`;
  } else {
    return '';
  }
}
