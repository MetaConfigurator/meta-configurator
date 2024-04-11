import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {PathElement} from '@/model/path';

/**
 * Generates placeholder text for a property.
 * This placeholder text can be used in the UI to give the user hints on what to enter.
 *
 * This will first try to use the examples, then the default value, then the title and finally the property name.
 *
 * @param schema the schema of the property
 * @param propertyName the name of the property
 */
export function generatePlaceholderText(schema: JsonSchemaWrapper, propertyName: PathElement) {
  if (schema.examples && schema.examples.length > 0) {
    return `e.g. ${schema.examples.join(', ')}`;
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
