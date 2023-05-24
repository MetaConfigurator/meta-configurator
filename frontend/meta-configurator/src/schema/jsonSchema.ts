import type { AllowedTypes, JsonSchemaType } from "@/schema/type";
import { nonBooleanSchema } from "@/schema/SchemaUtils";

interface SimpleInterface {

}

export class JsonSchema {

  private jsonSchema;

  constructor(jsonSchema: JsonSchemaType) {
    this.jsonSchema = nonBooleanSchema(jsonSchema);
  }

  get $anchor(): string | undefined {
    return this.jsonSchema?.$anchor;
  }

  get $comment(): string | undefined {
    return this.jsonSchema?.$comment;
  }

  get $dynamicAnchor(): string | undefined {
    return this.jsonSchema?.$dynamicAnchor;
  }

  get $dynamicRef(): string | undefined {
    return this.jsonSchema?.$dynamicRef;
  }

  get $recursiveAnchor(): string | undefined {
    return this.jsonSchema?.$recursiveAnchor;
  }

  get $recursiveRef(): string | undefined {
    return this.jsonSchema?.$recursiveRef;
  }

  get $ref(): string | undefined {
    return this.jsonSchema?.$ref;
  }

  get additionalProperties(): JsonSchema {
    return new JsonSchema(this.jsonSchema?.additionalProperties ?? true);
  }

  get allOf(): [JsonSchemaType, ...JsonSchemaType[]] {
    return this.jsonSchema?.allOf;
  }

  get anyOf(): JsonSchema[] | undefined {
    return this.jsonSchema?.anyOf?.map((schema) => new JsonSchema(schema));
  }

  get const(): any | undefined {
    return this.jsonSchema?.const;
  }

  get contains(): JsonSchema | undefined {
    if (this.jsonSchema?.contains) {
      return new JsonSchema(this.jsonSchema.contains);
    }
    return undefined;
  }

  get contentEncoding(): string | undefined {
    return this.jsonSchema?.contentEncoding;
  }

  get contentMediaType(): string | undefined {
    return this.jsonSchema?.contentMediaType;
  }

  get contentSchema(): JsonSchema | undefined {
    if (this.jsonSchema?.contentSchema) {
      return new JsonSchema(this.jsonSchema.contentSchema);
    }
    return undefined;
  }

  get default(): any | undefined {
    return this.jsonSchema?.default;
  }

  /**
   * @deprecated
   */
  private get definitions(): Map<string, JsonSchema> {
    return this.schemaMap(this.jsonSchema?.definitions);
  }

  private get dependencies(): Map<string, JsonSchema | string[]> {
    if (!this.jsonSchema?.dependencies) {
      return new Map<string, JsonSchema | string[]>();
    }
    const map = new Map<string, JsonSchema | string[]>();
    for (const [key, value] of Object.entries(this.jsonSchema.dependencies)) {
      if (Array.isArray(value)) {
        map.set(key, value);
      } else {
        map.set(key, new JsonSchema(value));
      }
    }
    return map;
  }

  get dependentRequired(): { [k: string]: string[] } {
    return this.jsonSchema?.dependentRequired ?? {};
  }

  get dependentSchemas(): Map<string, JsonSchema> {
    return this.schemaMap(this.jsonSchema?.dependentSchemas);
  }

  get deprecated(): boolean {
    return this.jsonSchema?.deprecated ?? false;
  }

  get description(): string | undefined {
    return this.jsonSchema?.description;
  }

  get else(): JsonSchema {
    return this.jsonSchema?.else;
  }

  get enum(): unknown[] {
    return this.jsonSchema?.enum;
  }

  get examples(): unknown[] {
    return this.jsonSchema?.examples;
  }

  get exclusiveMaximum(): number | undefined {
    return this.jsonSchema?.exclusiveMaximum;
  }

  get exclusiveMinimum(): number | undefined {
    return this.jsonSchema?.exclusiveMinimum;
  }

  get format(): string | undefined {
    return this.jsonSchema?.format;
  }

  get if(): JsonSchema | undefined {
    return schemafromObject(this.jsonSchema?.if);
  }

  get items(): JsonSchema | undefined {
    return schemafromObject(this.jsonSchema?.items);
  }

  get maxContains(): number | undefined {
    return this.jsonSchema?.maxContains;
  }

  get maxItems(): number | undefined {
    return this.jsonSchema?.maxItems;
  }

  get maxLength(): number | undefined {
    return this.jsonSchema?.maxLength;
  }

  get maxProperties(): number | undefined {
    return this.jsonSchema?.maxProperties;
  }

  get maximum(): number | undefined {
    return this.jsonSchema?.maximum;
  }

  get minContains(): number | undefined {
    return this.jsonSchema?.minContains;
  }

  get minItems(): number | undefined {
    return this.jsonSchema?.minItems;
  }

  get minLength(): number | undefined {
    return this.jsonSchema?.minLength;
  }

  get minProperties(): number | undefined {
    return this.jsonSchema?.minProperties;
  }

  get minimum(): number | undefined {
    return this.jsonSchema?.minimum;
  }

  get multipleOf(): number | undefined {
    return this.jsonSchema?.multipleOf;
  }

  get not(): JsonSchemaType | boolean {
    return this.jsonSchema?.not;
  }

  get oneOf(): [JsonSchemaType, ...JsonSchemaType[]] {
    return this.jsonSchema?.oneOf;
  }

  get pattern(): string | undefined {
    return this.jsonSchema?.pattern;
  }

  get patternProperties(): { [p: string]: JsonSchemaType | boolean } {
    return this.jsonSchema?.patternProperties;
  }

  get prefixItems(): [JsonSchemaType, ...JsonSchemaType[]] {
    return this.jsonSchema?.prefixItems;
  }

  get properties(): { [p: string]: JsonSchemaType | boolean } {
    return this.jsonSchema?.properties;
  }

  get propertyNames(): JsonSchemaType | boolean {
    return this.jsonSchema?.propertyNames;
  }

  get readOnly(): boolean {
    return this.jsonSchema?.readOnly;
  }

  get required(): string[] {
    return this.jsonSchema?.required;
  }

  get then(): JsonSchemaType | boolean {
    return this.jsonSchema?.then;
  }

  get title(): string | undefined {
    return this.jsonSchema?.title;
  }

  get type(): AllowedTypes {
    return this.jsonSchema?.type;
  }

  get unevaluatedItems(): JsonSchemaType | boolean {
    return this.jsonSchema?.unevaluatedItems;
  }

  get unevaluatedProperties(): JsonSchemaType | boolean {
    return this.jsonSchema?.unevaluatedProperties;
  }

  get uniqueItems(): boolean {
    return this.jsonSchema?.uniqueItems;
  }

  get writeOnly(): boolean {
    return this.jsonSchema?.writeOnly;
  }

  private schemaMap(schema?: JsonSchemaType): Map<string, JsonSchema> {
    return new Map(Object.entries(schema ?? {})
      .map(([key, value]) => [key, new JsonSchema(value)]));
  }

}

export function schemafromObject(jsonSchema?: JsonSchemaType): JsonSchema | undefined {
  if (!jsonSchema) {
    return undefined;
  }
  return new JsonSchema(jsonSchema);
}
