import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {PathElement} from '@/model/path';

export function generatePlaceholderText(schema: JsonSchema, propertyName: PathElement) {
  if (schema.examples && schema.examples.length > 0) {
    return `e.g. ${schema.examples}`;
  } else if (schema.default !== undefined) {
    return `e.g. ${schema.default}`;
  } else if (schema.title !== undefined) {
    return `${schema.title}`;
  } else if (typeof propertyName === 'string') {
    return `${propertyName}`;
  } else {
    return ``;
  }
}
