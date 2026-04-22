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

  protected visitSchema(_schema: JsonSchemaObjectType, _context: VisitorContext): void {}
  protected visitBooleanSchema(_value: boolean, _context: VisitorContext): void {}
  protected visitRef(_ref: string, _context: VisitorContext): void {}
  protected visitProperty(_name: string, _schema: JsonSchemaType, _context: VisitorContext): void {}
  protected visitPatternProperty(
    _pattern: string,
    _schema: JsonSchemaType,
    _context: VisitorContext
  ): void {}
  protected visitSubSchemaKeyword(
    _keyword: string,
    _schema: JsonSchemaType,
    _context: VisitorContext
  ): void {}
  protected visitCompositional(
    _keyword: string,
    _schemas: JsonSchemaType | JsonSchemaType[],
    _context: VisitorContext
  ): void {}
  protected visitConditional(
    _keyword: string,
    _schema: JsonSchemaType,
    _context: VisitorContext
  ): void {}
  protected visitDefinition(
    _name: string,
    _schema: JsonSchemaType,
    _context: VisitorContext
  ): void {}

  private invalid(
    keyword: string,
    expected: string,
    path: readonly (string | number)[],
    actual: unknown
  ): false {
    if (this.strict) {
      throw new TypeError(
        `[/${path.join('/')}] "${keyword}" must be ${expected}, got ${typeName(actual)}`
      );
    }
    return false;
  }

  private checkStr(v: unknown, keyword: string, path: readonly (string | number)[]): v is string {
    return typeof v === 'string' || this.invalid(keyword, 'a string', path, v);
  }

  private checkNum(v: unknown, keyword: string, path: readonly (string | number)[]): v is number {
    return typeof v === 'number' || this.invalid(keyword, 'a number', path, v);
  }

  private checkBool(v: unknown, keyword: string, path: readonly (string | number)[]): v is boolean {
    return typeof v === 'boolean' || this.invalid(keyword, 'a boolean', path, v);
  }

  private checkArr(
    v: unknown,
    keyword: string,
    path: readonly (string | number)[]
  ): v is unknown[] {
    return Array.isArray(v) || this.invalid(keyword, 'an array', path, v);
  }

  private checkObj(
    v: unknown,
    keyword: string,
    path: readonly (string | number)[]
  ): v is Record<string, unknown> {
    return (
      (typeof v === 'object' && v !== null && !Array.isArray(v)) ||
      this.invalid(keyword, 'an object', path, v)
    );
  }

  private checkSchema(
    v: unknown,
    keyword: string,
    path: readonly (string | number)[]
  ): v is JsonSchemaType {
    return (
      typeof v === 'boolean' ||
      (typeof v === 'object' && v !== null && !Array.isArray(v)) ||
      this.invalid(keyword, 'a schema (boolean or object)', path, v)
    );
  }

  private checkStrOrArr(
    v: unknown,
    keyword: string,
    path: readonly (string | number)[]
  ): v is string | string[] {
    return (
      typeof v === 'string' ||
      Array.isArray(v) ||
      this.invalid(keyword, 'a string or array', path, v)
    );
  }

  private checkNumOrBool(
    v: unknown,
    keyword: string,
    path: readonly (string | number)[]
  ): v is number | boolean {
    return (
      typeof v === 'number' ||
      typeof v === 'boolean' ||
      this.invalid(keyword, 'a number or boolean', path, v)
    );
  }

  private walk(value: unknown, context: VisitorContext): void {
    if (typeof value === 'boolean') {
      this.visitBooleanSchema(value, context);
      return;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      this.invalid('(schema)', 'a boolean or object', context.path, value);
      return;
    }
    const schema = value as Record<string, unknown>;
    this.visitSchema(schema as JsonSchemaObjectType, context);
    this.walkKeywords(schema, context);
  }

  private child(
    context: VisitorContext,
    keyword: string,
    segments: (string | number)[],
    kind: SchemaKeywordKind = 'keyword'
  ): VisitorContext {
    return {
      path: [...context.path, ...segments],
      depth: context.depth + 1,
      parentKeyword: keyword,
      parentKind: kind,
    };
  }

  private walkKeywords(schema: Record<string, unknown>, context: VisitorContext): void {
    for (const keyword of ['$ref', '$dynamicRef', '$recursiveRef'] as const) {
      if (keyword in schema && this.checkStr(schema[keyword], keyword, context.path)) {
        this.visitRef(schema[keyword], context);
      }
    }

    // scalar keyword validation — no hooks, values accessible via visitSchema
    if ('$schema' in schema) this.checkStr(schema.$schema, '$schema', context.path);
    if ('$id' in schema) this.checkStr(schema.$id, '$id', context.path);
    if ('id' in schema) this.checkStr(schema.id, 'id', context.path);
    if ('$anchor' in schema) this.checkStr(schema.$anchor, '$anchor', context.path);
    if ('$dynamicAnchor' in schema)
      this.checkStr(schema.$dynamicAnchor, '$dynamicAnchor', context.path);
    if ('$recursiveAnchor' in schema)
      this.checkStr(schema.$recursiveAnchor, '$recursiveAnchor', context.path);
    if ('$comment' in schema) this.checkStr(schema.$comment, '$comment', context.path);
    if ('title' in schema) this.checkStr(schema.title, 'title', context.path);
    if ('description' in schema) this.checkStr(schema.description, 'description', context.path);
    if ('examples' in schema) this.checkArr(schema.examples, 'examples', context.path);
    if ('deprecated' in schema) this.checkBool(schema.deprecated, 'deprecated', context.path);
    if ('readOnly' in schema) this.checkBool(schema.readOnly, 'readOnly', context.path);
    if ('writeOnly' in schema) this.checkBool(schema.writeOnly, 'writeOnly', context.path);
    if ('type' in schema) this.checkStrOrArr(schema.type, 'type', context.path);
    if ('enum' in schema) this.checkArr(schema.enum, 'enum', context.path);
    if ('format' in schema) this.checkStr(schema.format, 'format', context.path);
    if ('pattern' in schema) this.checkStr(schema.pattern, 'pattern', context.path);
    if ('contentMediaType' in schema)
      this.checkStr(schema.contentMediaType, 'contentMediaType', context.path);
    if ('contentEncoding' in schema)
      this.checkStr(schema.contentEncoding, 'contentEncoding', context.path);
    if ('required' in schema) this.checkArr(schema.required, 'required', context.path);
    if ('dependentRequired' in schema)
      this.checkObj(schema.dependentRequired, 'dependentRequired', context.path);
    if ('minLength' in schema) this.checkNum(schema.minLength, 'minLength', context.path);
    if ('maxLength' in schema) this.checkNum(schema.maxLength, 'maxLength', context.path);
    if ('minimum' in schema) this.checkNum(schema.minimum, 'minimum', context.path);
    if ('maximum' in schema) this.checkNum(schema.maximum, 'maximum', context.path);
    if ('exclusiveMinimum' in schema)
      this.checkNumOrBool(schema.exclusiveMinimum, 'exclusiveMinimum', context.path);
    if ('exclusiveMaximum' in schema)
      this.checkNumOrBool(schema.exclusiveMaximum, 'exclusiveMaximum', context.path);
    if ('multipleOf' in schema) this.checkNum(schema.multipleOf, 'multipleOf', context.path);
    if ('minItems' in schema) this.checkNum(schema.minItems, 'minItems', context.path);
    if ('maxItems' in schema) this.checkNum(schema.maxItems, 'maxItems', context.path);
    if ('uniqueItems' in schema) this.checkBool(schema.uniqueItems, 'uniqueItems', context.path);
    if ('minContains' in schema) this.checkNum(schema.minContains, 'minContains', context.path);
    if ('maxContains' in schema) this.checkNum(schema.maxContains, 'maxContains', context.path);
    if ('minProperties' in schema)
      this.checkNum(schema.minProperties, 'minProperties', context.path);
    if ('maxProperties' in schema)
      this.checkNum(schema.maxProperties, 'maxProperties', context.path);

    if ('properties' in schema && this.checkObj(schema.properties, 'properties', context.path)) {
      for (const [name, propSchema] of Object.entries(
        schema.properties as Record<string, unknown>
      )) {
        if (this.checkSchema(propSchema, `properties["${name}"]`, context.path)) {
          const propCtx = this.child(context, name, ['properties', name], 'property');
          this.visitProperty(name, propSchema, propCtx);
          this.walk(propSchema, propCtx);
        }
      }
    }

    if (
      'patternProperties' in schema &&
      this.checkObj(schema.patternProperties, 'patternProperties', context.path)
    ) {
      for (const [pattern, patSchema] of Object.entries(
        schema.patternProperties as Record<string, unknown>
      )) {
        if (this.checkSchema(patSchema, `patternProperties["${pattern}"]`, context.path)) {
          const patCtx = this.child(context, pattern, ['patternProperties', pattern], 'pattern');
          this.visitPatternProperty(pattern, patSchema, patCtx);
          this.walk(patSchema, patCtx);
        }
      }
    }

    for (const keyword of [
      'additionalProperties',
      'unevaluatedProperties',
      'propertyNames',
      'additionalItems',
      'unevaluatedItems',
      'contains',
      'contentSchema',
    ]) {
      if (keyword in schema && this.checkSchema(schema[keyword], keyword, context.path)) {
        const keywordContext = this.child(context, keyword, [keyword]);
        this.visitSubSchemaKeyword(keyword, schema[keyword] as JsonSchemaType, keywordContext);
        this.walk(schema[keyword], keywordContext);
      }
    }

    if ('items' in schema) {
      if (Array.isArray(schema.items)) {
        schema.items.forEach((item, i) => {
          if (this.checkSchema(item, `items[${i}]`, context.path)) {
            const itemCtx = this.child(context, 'items', ['items', i]);
            this.visitSubSchemaKeyword('items', item, itemCtx);
            this.walk(item, itemCtx);
          }
        });
      } else if (this.checkSchema(schema.items, 'items', context.path)) {
        const itemCtx = this.child(context, 'items', ['items']);
        this.visitSubSchemaKeyword('items', schema.items, itemCtx);
        this.walk(schema.items, itemCtx);
      }
    }

    if ('prefixItems' in schema && this.checkArr(schema.prefixItems, 'prefixItems', context.path)) {
      schema.prefixItems.forEach((item, i) => {
        if (this.checkSchema(item, `prefixItems[${i}]`, context.path)) {
          const itemCtx = this.child(context, 'prefixItems', ['prefixItems', i]);
          this.visitSubSchemaKeyword('prefixItems', item, itemCtx);
          this.walk(item, itemCtx);
        }
      });
    }

    for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
      if (keyword in schema && this.checkArr(schema[keyword], keyword, context.path)) {
        const schemas = schema[keyword] as unknown[];
        this.visitCompositional(keyword, schemas as JsonSchemaType[], context);
        schemas.forEach((s, i) => {
          if (this.checkSchema(s, `${keyword}[${i}]`, context.path)) {
            this.walk(s, this.child(context, keyword, [keyword, i]));
          }
        });
      }
    }

    if ('not' in schema && this.checkSchema(schema.not, 'not', context.path)) {
      this.visitCompositional('not', schema.not, context);
      this.walk(schema.not, this.child(context, 'not', ['not']));
    }

    for (const keyword of ['if', 'then', 'else']) {
      if (keyword in schema && this.checkSchema(schema[keyword], keyword, context.path)) {
        const keywordContext = this.child(context, keyword, [keyword]);
        this.visitConditional(keyword, schema[keyword] as JsonSchemaType, keywordContext);
        this.walk(schema[keyword], keywordContext);
      }
    }

    for (const defsKeyword of ['$defs', 'definitions']) {
      if (defsKeyword in schema && this.checkObj(schema[defsKeyword], defsKeyword, context.path)) {
        for (const [name, defSchema] of Object.entries(
          schema[defsKeyword] as Record<string, unknown>
        )) {
          if (this.checkSchema(defSchema, `${defsKeyword}["${name}"]`, context.path)) {
            const definitionContext = this.child(context, name, [defsKeyword, name], 'definition');
            this.visitDefinition(name, defSchema, definitionContext);
            this.walk(defSchema, definitionContext);
          }
        }
      }
    }

    if (
      'dependentSchemas' in schema &&
      this.checkObj(schema.dependentSchemas, 'dependentSchemas', context.path)
    ) {
      for (const [name, depSchema] of Object.entries(
        schema.dependentSchemas as Record<string, unknown>
      )) {
        if (this.checkSchema(depSchema, `dependentSchemas["${name}"]`, context.path)) {
          const dependentContext = this.child(
            context,
            name,
            ['dependentSchemas', name],
            'definition'
          );
          this.visitDefinition(name, depSchema, dependentContext);
          this.walk(depSchema, dependentContext);
        }
      }
    }

    if (
      'dependencies' in schema &&
      this.checkObj(schema.dependencies, 'dependencies', context.path)
    ) {
      for (const [key, dep] of Object.entries(schema.dependencies as Record<string, unknown>)) {
        if (Array.isArray(dep)) continue;
        if (this.checkSchema(dep, `dependencies["${key}"]`, context.path)) {
          const dependenciesContext = this.child(context, key, ['dependencies', key], 'definition');
          this.visitDefinition(key, dep, dependenciesContext);
          this.walk(dep, dependenciesContext);
        }
      }
    }
  }
}
