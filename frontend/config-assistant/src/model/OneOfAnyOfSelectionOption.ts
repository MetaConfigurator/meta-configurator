import type {JsonSchema} from '@/helpers/schema/JsonSchema';

export class OneOfAnyOfSelectionOption {
  constructor(displayText: string, index: number) {
    this.displayText = displayText;
    this.index = index;
  }

  index: number;
  displayText: string;

  public toString = (): string => {
    return this.displayText;
  };
}

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
