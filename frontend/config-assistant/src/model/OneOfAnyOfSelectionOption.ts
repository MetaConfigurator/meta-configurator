import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {dataToString} from '@/helpers/dataToString';

export class OneOfAnyOfSelectionOption {
  constructor(name: string, index: number) {
    this.name = name;
    this.index = index;
  }

  index: number;
  name: string;

  public toString = (): string => {
    return this.name;
  };
}

/**
 * Creates a human-readable description of the schema that can be used as a label for a selection option.
 *
 * @param schema the schema to describe
 * @param index  the index of the schema in the list of schemas
 */
export function schemaOptionToString(schema: JsonSchema, index: number): string {
  let result = `${index}`;

  if (schema.title) {
    result += ': ' + schema.title;
  } else if (schema.description) {
    result += ': ' + schema.description;
  } else if (schema.type) {
    result += ': ' + schema.type;
  }

  return result;
}
