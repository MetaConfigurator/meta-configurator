import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {dataToString} from '@/utility/dataToString';

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
export function schemaOptionToString(schema: JsonSchemaWrapper, index: number): string {
  if (schema.title) {
    return `${index}: ${schema.title}`;
  }
  if (schema.description) {
    return `${index}: ${schema.description}`;
  }

  // get rid of the $id property for the description
  const schemaToDescribe = {...schema.jsonSchema};
  delete schemaToDescribe.$id;

  return `${index}: ${dataToString(schemaToDescribe, 1, 60)}`;
}
