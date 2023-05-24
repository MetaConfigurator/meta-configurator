import type { AllowedType, JsonSchemaType } from "@/schema/type";

export class SchemaHelper {
  private schema: JsonSchemaType;

  constructor(schema: JsonSchemaType) {
    this.schema = schema;
  }

  /**
   * Check if the schema has the given type at the root level.
   * @param type The type to check for.
   */
  public isOfType(type: AllowedType): boolean {
    if (this.schema === false || this.schema === true) {
      // If the schema is a boolean, it has either no type or all types.
      return this.schema;
    }

    if (!this.schema.type) {
      // If the schema does not have a type, it is valid for all types.
      return true;
    }
    if (this.schema.type === type) {
      return true;
    }
    if (Array.isArray(this.schema.type)) {
      return this.schema.type.includes(type);
    }
    return false;
  }

  public getSubSchema(propertyName: string): JsonSchemaType {
    if (this.schema === false || this.schema === true) {
      return this.schema; // If the schema is a boolean, it is either valid or invalid for all types.
    }
    if (this.schema.properties && this.schema.properties[propertyName]) {
      return this.schema.properties[propertyName];
    } else if (this.schema.additionalProperties !== false) {
      return this.schema.additionalProperties ?? true; // default value for additionalProperties is true
    } else {
      return false; // If the schema does not have a property with the given key
      // and does not allow additional properties, it is invalid for all types.
    }
  }

  /**
   * Traverses the schema and returns the schema at the given path.
   * @param path The array of keys to traverse.
   * @returns The schema at the given path. Will resolve to false if the path does not exist.
   */
  public getSubSchemaAtPath(path: string[]): JsonSchemaType {
    let currentSchema: JsonSchemaType = this.schema;
    for (const key of path) {
      currentSchema = this.getSubSchema(key);
    }
    return currentSchema;
  }

  public isPropertyRequired(propertyName: string): boolean {
    if (this.schema === false || this.schema === true) {
      return false; // Neither way the property is required.
    }
    return (this.schema.required && this.schema.required.includes(propertyName)) ?? false;
  }

}

export function nonBooleanSchema(schema: JsonSchemaType) {
  if (schema === true) {
    return { };
  }
  if (schema === false) {
    return undefined;
  }
  return schema;
}


