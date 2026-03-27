import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {isExternalRef} from '@/schema/externalReferences.ts';
import {JsonSchemaVisitor} from '@/schema/jsonSchemaVisitor.ts';

export type SchemaFeatures = {
  composition: boolean;
  conditionals: boolean;
  defaultValues: boolean;
  exampleValues: boolean;
  enums: boolean;
  constants: boolean;
  multipleTypes: boolean;
  references: boolean;
  required: boolean;
  negation: boolean;
  booleanSchemas: boolean;
  descriptions: boolean;
  titles: boolean;
  externalReferences: boolean;
  // on purpose, we currently do not track whether it uses constraints (e.g., maxLength, minLength, etc.) because there are so many of them and for our use case we do not need to know about them
};

class SchemaFeaturesVisitor extends JsonSchemaVisitor {
  readonly features: SchemaFeatures = {
    composition: false,
    conditionals: false,
    defaultValues: false,
    exampleValues: false,
    enums: false,
    constants: false,
    multipleTypes: false,
    references: false,
    required: false,
    negation: false,
    booleanSchemas: false,
    descriptions: false,
    titles: false,
    externalReferences: false,
  };

  protected visitBooleanSchema(): void {
    this.features.booleanSchemas = true;
  }

  protected visitSchema(schema: JsonSchemaObjectType): void {
    if (schema.allOf || schema.anyOf || schema.oneOf) this.features.composition = true;
    if (schema.if !== undefined || schema.then !== undefined || schema.else !== undefined)
      this.features.conditionals = true;
    if ('default' in schema) this.features.defaultValues = true;
    if (schema.examples) this.features.exampleValues = true;
    if (schema.enum) this.features.enums = true;
    if ('const' in schema) this.features.constants = true;
    if (Array.isArray(schema.type)) this.features.multipleTypes = true;
    if (schema.required) this.features.required = true;
    if (schema.not !== undefined) this.features.negation = true;
    if (schema.description) this.features.descriptions = true;
    if (schema.title) this.features.titles = true;
  }

  protected visitRef(ref: string): void {
    this.features.references = true;
    if (isExternalRef(ref)) this.features.externalReferences = true;
  }
}

export function detectSchemaFeatures(jsonSchema: TopLevelSchema): SchemaFeatures {
  const visitor = new SchemaFeaturesVisitor(false);
  visitor.traverse(jsonSchema);
  return visitor.features;
}
