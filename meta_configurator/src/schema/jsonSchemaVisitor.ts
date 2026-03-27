import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';

export type SchemaKeywordKind = 'keyword' | 'property' | 'pattern' | 'definition';

export interface VisitorContext {
  readonly path: readonly (string | number)[];
  readonly depth: number;
  readonly parentKeyword: string | null;
  readonly parentKind: SchemaKeywordKind | null;
}

function typeName(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

/**
 * Base class for traversing a JSON Schema (drafts 4–2020-12).
 * Subclass and override whichever hooks you need. All hooks default to no-ops.
 *
 * @param strict When true (default), malformed keyword values throw a TypeError.
 *               When false, invalid keywords are silently skipped.
 *
 * Hooks fired in traversal order per schema node:
 * - visitSchema           – every object schema, before keyword traversal
 * - visitBooleanSchema    – boolean schemas (true / false)
 * - visitRef              – $ref, $dynamicRef, $recursiveRef values
 * - visitProperty         – each named entry in `properties`
 * - visitPatternProperty  – each entry in `patternProperties`
 * - visitSubSchemaKeyword – single-schema keywords (items, additionalProperties, …)
 * - visitCompositional    – allOf / anyOf / oneOf / not
 * - visitConditional      – if / then / else
 * - visitDefinition       – each entry in $defs, definitions, dependentSchemas,
 *                           or schema-valued dependencies
 */
export abstract class JsonSchemaVisitor {
  constructor(readonly strict = true) {}

  traverse(schema: JsonSchemaType): void {
    this.walk(schema, {path: [], depth: 0, parentKeyword: null, parentKind: null});
  }

  protected visitSchema(_schema: JsonSchemaObjectType, _ctx: VisitorContext): void {}
  protected visitBooleanSchema(_value: boolean, _ctx: VisitorContext): void {}
  protected visitRef(_ref: string, _ctx: VisitorContext): void {}
  protected visitProperty(_name: string, _schema: JsonSchemaType, _ctx: VisitorContext): void {}
  protected visitPatternProperty(_pattern: string, _schema: JsonSchemaType, _ctx: VisitorContext): void {}
  protected visitSubSchemaKeyword(_keyword: string, _schema: JsonSchemaType, _ctx: VisitorContext): void {}
  protected visitCompositional(_keyword: string, _schemas: JsonSchemaType | JsonSchemaType[], _ctx: VisitorContext): void {}
  protected visitConditional(_keyword: string, _schema: JsonSchemaType, _ctx: VisitorContext): void {}
  protected visitDefinition(_name: string, _schema: JsonSchemaType, _ctx: VisitorContext): void {}

  private invalid(kw: string, expected: string, path: readonly (string | number)[], actual: unknown): false {
    if (this.strict) {
      throw new TypeError(`[/${path.join('/')}] "${kw}" must be ${expected}, got ${typeName(actual)}`);
    }
    return false;
  }

  private checkStr(v: unknown, kw: string, path: readonly (string | number)[]): v is string {
    return typeof v === 'string' || this.invalid(kw, 'a string', path, v);
  }

  private checkNum(v: unknown, kw: string, path: readonly (string | number)[]): v is number {
    return typeof v === 'number' || this.invalid(kw, 'a number', path, v);
  }

  private checkBool(v: unknown, kw: string, path: readonly (string | number)[]): v is boolean {
    return typeof v === 'boolean' || this.invalid(kw, 'a boolean', path, v);
  }

  private checkArr(v: unknown, kw: string, path: readonly (string | number)[]): v is unknown[] {
    return Array.isArray(v) || this.invalid(kw, 'an array', path, v);
  }

  private checkObj(v: unknown, kw: string, path: readonly (string | number)[]): v is Record<string, unknown> {
    return (typeof v === 'object' && v !== null && !Array.isArray(v)) || this.invalid(kw, 'an object', path, v);
  }

  private checkSchema(v: unknown, kw: string, path: readonly (string | number)[]): v is JsonSchemaType {
    return (typeof v === 'boolean' || (typeof v === 'object' && v !== null && !Array.isArray(v)))
      || this.invalid(kw, 'a schema (boolean or object)', path, v);
  }

  private checkStrOrArr(v: unknown, kw: string, path: readonly (string | number)[]): v is string | string[] {
    return (typeof v === 'string' || Array.isArray(v)) || this.invalid(kw, 'a string or array', path, v);
  }

  private checkNumOrBool(v: unknown, kw: string, path: readonly (string | number)[]): v is number | boolean {
    return (typeof v === 'number' || typeof v === 'boolean') || this.invalid(kw, 'a number or boolean', path, v);
  }

  private walk(value: unknown, ctx: VisitorContext): void {
    if (typeof value === 'boolean') {
      this.visitBooleanSchema(value, ctx);
      return;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      this.invalid('(schema)', 'a boolean or object', ctx.path, value);
      return;
    }
    const schema = value as Record<string, unknown>;
    this.visitSchema(schema as JsonSchemaObjectType, ctx);
    this.walkKeywords(schema, ctx);
  }

  private child(
    ctx: VisitorContext,
    keyword: string,
    segments: (string | number)[],
    kind: SchemaKeywordKind = 'keyword'
  ): VisitorContext {
    return {path: [...ctx.path, ...segments], depth: ctx.depth + 1, parentKeyword: keyword, parentKind: kind};
  }

  private walkKeywords(schema: Record<string, unknown>, ctx: VisitorContext): void {
    for (const kw of ['$ref', '$dynamicRef', '$recursiveRef'] as const) {
      if (kw in schema && this.checkStr(schema[kw], kw, ctx.path)) {
        this.visitRef(schema[kw], ctx);
      }
    }

    // scalar keyword validation — no hooks, values accessible via visitSchema
    if ('$schema' in schema) this.checkStr(schema.$schema, '$schema', ctx.path);
    if ('$id' in schema) this.checkStr(schema.$id, '$id', ctx.path);
    if ('id' in schema) this.checkStr(schema.id, 'id', ctx.path);
    if ('$anchor' in schema) this.checkStr(schema.$anchor, '$anchor', ctx.path);
    if ('$dynamicAnchor' in schema) this.checkStr(schema.$dynamicAnchor, '$dynamicAnchor', ctx.path);
    if ('$recursiveAnchor' in schema) this.checkStr(schema.$recursiveAnchor, '$recursiveAnchor', ctx.path);
    if ('$comment' in schema) this.checkStr(schema.$comment, '$comment', ctx.path);
    if ('title' in schema) this.checkStr(schema.title, 'title', ctx.path);
    if ('description' in schema) this.checkStr(schema.description, 'description', ctx.path);
    if ('examples' in schema) this.checkArr(schema.examples, 'examples', ctx.path);
    if ('deprecated' in schema) this.checkBool(schema.deprecated, 'deprecated', ctx.path);
    if ('readOnly' in schema) this.checkBool(schema.readOnly, 'readOnly', ctx.path);
    if ('writeOnly' in schema) this.checkBool(schema.writeOnly, 'writeOnly', ctx.path);
    if ('type' in schema) this.checkStrOrArr(schema.type, 'type', ctx.path);
    if ('enum' in schema) this.checkArr(schema.enum, 'enum', ctx.path);
    if ('format' in schema) this.checkStr(schema.format, 'format', ctx.path);
    if ('pattern' in schema) this.checkStr(schema.pattern, 'pattern', ctx.path);
    if ('contentMediaType' in schema) this.checkStr(schema.contentMediaType, 'contentMediaType', ctx.path);
    if ('contentEncoding' in schema) this.checkStr(schema.contentEncoding, 'contentEncoding', ctx.path);
    if ('required' in schema) this.checkArr(schema.required, 'required', ctx.path);
    if ('dependentRequired' in schema) this.checkObj(schema.dependentRequired, 'dependentRequired', ctx.path);
    if ('minLength' in schema) this.checkNum(schema.minLength, 'minLength', ctx.path);
    if ('maxLength' in schema) this.checkNum(schema.maxLength, 'maxLength', ctx.path);
    if ('minimum' in schema) this.checkNum(schema.minimum, 'minimum', ctx.path);
    if ('maximum' in schema) this.checkNum(schema.maximum, 'maximum', ctx.path);
    if ('exclusiveMinimum' in schema) this.checkNumOrBool(schema.exclusiveMinimum, 'exclusiveMinimum', ctx.path);
    if ('exclusiveMaximum' in schema) this.checkNumOrBool(schema.exclusiveMaximum, 'exclusiveMaximum', ctx.path);
    if ('multipleOf' in schema) this.checkNum(schema.multipleOf, 'multipleOf', ctx.path);
    if ('minItems' in schema) this.checkNum(schema.minItems, 'minItems', ctx.path);
    if ('maxItems' in schema) this.checkNum(schema.maxItems, 'maxItems', ctx.path);
    if ('uniqueItems' in schema) this.checkBool(schema.uniqueItems, 'uniqueItems', ctx.path);
    if ('minContains' in schema) this.checkNum(schema.minContains, 'minContains', ctx.path);
    if ('maxContains' in schema) this.checkNum(schema.maxContains, 'maxContains', ctx.path);
    if ('minProperties' in schema) this.checkNum(schema.minProperties, 'minProperties', ctx.path);
    if ('maxProperties' in schema) this.checkNum(schema.maxProperties, 'maxProperties', ctx.path);

    if ('properties' in schema && this.checkObj(schema.properties, 'properties', ctx.path)) {
      for (const [name, propSchema] of Object.entries(schema.properties as Record<string, unknown>)) {
        if (this.checkSchema(propSchema, `properties["${name}"]`, ctx.path)) {
          const propCtx = this.child(ctx, name, ['properties', name], 'property');
          this.visitProperty(name, propSchema, propCtx);
          this.walk(propSchema, propCtx);
        }
      }
    }

    if ('patternProperties' in schema && this.checkObj(schema.patternProperties, 'patternProperties', ctx.path)) {
      for (const [pattern, patSchema] of Object.entries(schema.patternProperties as Record<string, unknown>)) {
        if (this.checkSchema(patSchema, `patternProperties["${pattern}"]`, ctx.path)) {
          const patCtx = this.child(ctx, pattern, ['patternProperties', pattern], 'pattern');
          this.visitPatternProperty(pattern, patSchema, patCtx);
          this.walk(patSchema, patCtx);
        }
      }
    }

    for (const kw of [
      'additionalProperties', 'unevaluatedProperties', 'propertyNames',
      'additionalItems', 'unevaluatedItems', 'contains', 'contentSchema',
    ]) {
      if (kw in schema && this.checkSchema(schema[kw], kw, ctx.path)) {
        const kwCtx = this.child(ctx, kw, [kw]);
        this.visitSubSchemaKeyword(kw, schema[kw] as JsonSchemaType, kwCtx);
        this.walk(schema[kw], kwCtx);
      }
    }

    if ('items' in schema) {
      if (Array.isArray(schema.items)) {
        schema.items.forEach((item, i) => {
          if (this.checkSchema(item, `items[${i}]`, ctx.path)) {
            const itemCtx = this.child(ctx, 'items', ['items', i]);
            this.visitSubSchemaKeyword('items', item, itemCtx);
            this.walk(item, itemCtx);
          }
        });
      } else if (this.checkSchema(schema.items, 'items', ctx.path)) {
        const itemCtx = this.child(ctx, 'items', ['items']);
        this.visitSubSchemaKeyword('items', schema.items, itemCtx);
        this.walk(schema.items, itemCtx);
      }
    }

    if ('prefixItems' in schema && this.checkArr(schema.prefixItems, 'prefixItems', ctx.path)) {
      schema.prefixItems.forEach((item, i) => {
        if (this.checkSchema(item, `prefixItems[${i}]`, ctx.path)) {
          const itemCtx = this.child(ctx, 'prefixItems', ['prefixItems', i]);
          this.visitSubSchemaKeyword('prefixItems', item, itemCtx);
          this.walk(item, itemCtx);
        }
      });
    }

    for (const kw of ['allOf', 'anyOf', 'oneOf']) {
      if (kw in schema && this.checkArr(schema[kw], kw, ctx.path)) {
        const schemas = schema[kw] as unknown[];
        this.visitCompositional(kw, schemas as JsonSchemaType[], ctx);
        schemas.forEach((s, i) => {
          if (this.checkSchema(s, `${kw}[${i}]`, ctx.path)) {
            this.walk(s, this.child(ctx, kw, [kw, i]));
          }
        });
      }
    }

    if ('not' in schema && this.checkSchema(schema.not, 'not', ctx.path)) {
      this.visitCompositional('not', schema.not, ctx);
      this.walk(schema.not, this.child(ctx, 'not', ['not']));
    }

    for (const kw of ['if', 'then', 'else']) {
      if (kw in schema && this.checkSchema(schema[kw], kw, ctx.path)) {
        const kwCtx = this.child(ctx, kw, [kw]);
        this.visitConditional(kw, schema[kw] as JsonSchemaType, kwCtx);
        this.walk(schema[kw], kwCtx);
      }
    }

    for (const defsKw of ['$defs', 'definitions']) {
      if (defsKw in schema && this.checkObj(schema[defsKw], defsKw, ctx.path)) {
        for (const [name, defSchema] of Object.entries(schema[defsKw] as Record<string, unknown>)) {
          if (this.checkSchema(defSchema, `${defsKw}["${name}"]`, ctx.path)) {
            const defCtx = this.child(ctx, name, [defsKw, name], 'definition');
            this.visitDefinition(name, defSchema, defCtx);
            this.walk(defSchema, defCtx);
          }
        }
      }
    }

    if ('dependentSchemas' in schema && this.checkObj(schema.dependentSchemas, 'dependentSchemas', ctx.path)) {
      for (const [name, depSchema] of Object.entries(schema.dependentSchemas as Record<string, unknown>)) {
        if (this.checkSchema(depSchema, `dependentSchemas["${name}"]`, ctx.path)) {
          const depCtx = this.child(ctx, name, ['dependentSchemas', name], 'definition');
          this.visitDefinition(name, depSchema, depCtx);
          this.walk(depSchema, depCtx);
        }
      }
    }

    if ('dependencies' in schema && this.checkObj(schema.dependencies, 'dependencies', ctx.path)) {
      for (const [key, dep] of Object.entries(schema.dependencies as Record<string, unknown>)) {
        if (Array.isArray(dep)) continue;
        if (this.checkSchema(dep, `dependencies["${key}"]`, ctx.path)) {
          const depCtx = this.child(ctx, key, ['dependencies', key], 'definition');
          this.visitDefinition(key, dep, depCtx);
          this.walk(dep, depCtx);
        }
      }
    }
  }
}
