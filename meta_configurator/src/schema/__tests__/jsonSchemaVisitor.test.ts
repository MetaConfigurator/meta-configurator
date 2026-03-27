import {describe, expect, it} from 'vitest';
import type {JsonSchemaObjectType, JsonSchemaType} from '@/schema/jsonSchemaType';
import {JsonSchemaVisitor, type VisitorContext} from '@/schema/jsonSchemaVisitor';

class RecordingVisitor extends JsonSchemaVisitor {
  readonly schemas: Array<{schema: JsonSchemaObjectType; ctx: VisitorContext}> = [];
  readonly booleans: Array<{value: boolean; ctx: VisitorContext}> = [];
  readonly refs: Array<{ref: string; ctx: VisitorContext}> = [];
  readonly properties: Array<{name: string; schema: JsonSchemaType; ctx: VisitorContext}> = [];
  readonly patternProperties: Array<{
    pattern: string;
    schema: JsonSchemaType;
    ctx: VisitorContext;
  }> = [];
  readonly subSchemaKeywords: Array<{
    keyword: string;
    schema: JsonSchemaType;
    ctx: VisitorContext;
  }> = [];
  readonly compositionals: Array<{
    keyword: string;
    schemas: JsonSchemaType | JsonSchemaType[];
    ctx: VisitorContext;
  }> = [];
  readonly conditionals: Array<{keyword: string; schema: JsonSchemaType; ctx: VisitorContext}> = [];
  readonly definitions: Array<{name: string; schema: JsonSchemaType; ctx: VisitorContext}> = [];

  protected visitSchema(schema: JsonSchemaObjectType, ctx: VisitorContext): void {
    this.schemas.push({schema, ctx});
  }
  protected visitBooleanSchema(value: boolean, ctx: VisitorContext): void {
    this.booleans.push({value, ctx});
  }
  protected visitRef(ref: string, ctx: VisitorContext): void {
    this.refs.push({ref, ctx});
  }
  protected visitProperty(name: string, schema: JsonSchemaType, ctx: VisitorContext): void {
    this.properties.push({name, schema, ctx});
  }
  protected visitPatternProperty(
    pattern: string,
    schema: JsonSchemaType,
    ctx: VisitorContext
  ): void {
    this.patternProperties.push({pattern, schema, ctx});
  }
  protected visitSubSchemaKeyword(
    keyword: string,
    schema: JsonSchemaType,
    ctx: VisitorContext
  ): void {
    this.subSchemaKeywords.push({keyword, schema, ctx});
  }
  protected visitCompositional(
    keyword: string,
    schemas: JsonSchemaType | JsonSchemaType[],
    ctx: VisitorContext
  ): void {
    this.compositionals.push({keyword, schemas, ctx});
  }
  protected visitConditional(keyword: string, schema: JsonSchemaType, ctx: VisitorContext): void {
    this.conditionals.push({keyword, schema, ctx});
  }
  protected visitDefinition(name: string, schema: JsonSchemaType, ctx: VisitorContext): void {
    this.definitions.push({name, schema, ctx});
  }
}

describe('JsonSchemaVisitor', () => {
  it('visits a simple object schema', () => {
    const visitor = new RecordingVisitor();
    const schema = {type: 'object', title: 'Root'};
    visitor.traverse(schema);

    expect(visitor.schemas).toHaveLength(1);
    expect(visitor.schemas[0].schema).toBe(schema);
    expect(visitor.schemas[0].ctx.depth).toBe(0);
    expect(visitor.schemas[0].ctx.path).toEqual([]);
    expect(visitor.schemas[0].ctx.parentKind).toBeNull();
  });

  it('visits a boolean schema', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse(true);

    expect(visitor.booleans).toHaveLength(1);
    expect(visitor.booleans[0].value).toBe(true);
  });

  it('visits properties with correct context', () => {
    const visitor = new RecordingVisitor();
    const schema = {
      type: 'object',
      properties: {
        name: {type: 'string'},
        age: {type: 'number'},
      },
    };
    visitor.traverse(schema);

    expect(visitor.properties).toHaveLength(2);
    expect(visitor.properties[0].name).toBe('name');
    expect(visitor.properties[0].ctx.path).toEqual(['properties', 'name']);
    expect(visitor.properties[0].ctx.parentKind).toBe('property');
    expect(visitor.properties[1].name).toBe('age');
    expect(visitor.properties[1].ctx.path).toEqual(['properties', 'age']);
  });

  it('visits patternProperties', () => {
    const visitor = new RecordingVisitor();
    const schema = {
      type: 'object',
      patternProperties: {
        '^S_': {type: 'string'},
      },
    };
    visitor.traverse(schema);

    expect(visitor.patternProperties).toHaveLength(1);
    expect(visitor.patternProperties[0].pattern).toBe('^S_');
    expect(visitor.patternProperties[0].ctx.parentKind).toBe('pattern');
    expect(visitor.patternProperties[0].ctx.path).toEqual(['patternProperties', '^S_']);
  });

  it('visits $ref', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({$ref: '#/$defs/foo'});

    expect(visitor.refs).toHaveLength(1);
    expect(visitor.refs[0].ref).toBe('#/$defs/foo');
  });

  it('visits allOf, anyOf, oneOf', () => {
    const visitor = new RecordingVisitor();
    const schema = {
      allOf: [{type: 'object'}],
      anyOf: [{type: 'string'}, {type: 'number'}],
      oneOf: [{type: 'boolean'}],
    };
    visitor.traverse(schema);

    const keywords = visitor.compositionals.map(c => c.keyword);
    expect(keywords).toContain('allOf');
    expect(keywords).toContain('anyOf');
    expect(keywords).toContain('oneOf');
  });

  it('visits not', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({not: {type: 'string'}});

    expect(visitor.compositionals).toHaveLength(1);
    expect(visitor.compositionals[0].keyword).toBe('not');
  });

  it('visits if/then/else', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({
      if: {type: 'string'},
      then: {minLength: 1},
      else: true,
    });

    const conditionalKeywords = visitor.conditionals.map(c => c.keyword);
    expect(conditionalKeywords).toContain('if');
    expect(conditionalKeywords).toContain('then');
    expect(conditionalKeywords).toContain('else');
    expect(visitor.conditionals[2].schema).toBe(true);
  });

  it('visits $defs', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({
      $defs: {
        foo: {type: 'string'},
        bar: {type: 'number'},
      },
    });

    expect(visitor.definitions).toHaveLength(2);
    const names = visitor.definitions.map(d => d.name);
    expect(names).toContain('foo');
    expect(names).toContain('bar');
    expect(visitor.definitions[0].ctx.parentKind).toBe('definition');
    expect(visitor.definitions[0].ctx.path).toEqual(['$defs', 'foo']);
  });

  it('visits legacy definitions keyword', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({definitions: {myDef: {type: 'object'}}});

    expect(visitor.definitions).toHaveLength(1);
    expect(visitor.definitions[0].name).toBe('myDef');
    expect(visitor.definitions[0].ctx.path).toEqual(['definitions', 'myDef']);
  });

  it('visits items as single schema', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({type: 'array', items: {type: 'string'}});

    expect(visitor.subSchemaKeywords).toHaveLength(1);
    expect(visitor.subSchemaKeywords[0].keyword).toBe('items');
    expect(visitor.subSchemaKeywords[0].ctx.path).toEqual(['items']);
  });

  it('visits items as array (tuple)', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({type: 'array', items: [{type: 'string'}, {type: 'number'}]});

    expect(visitor.subSchemaKeywords).toHaveLength(2);
    expect(visitor.subSchemaKeywords[0].ctx.path).toEqual(['items', 0]);
    expect(visitor.subSchemaKeywords[1].ctx.path).toEqual(['items', 1]);
  });

  it('visits additionalProperties', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({type: 'object', additionalProperties: {type: 'string'}});

    expect(visitor.subSchemaKeywords.some(k => k.keyword === 'additionalProperties')).toBe(true);
  });

  it('tracks depth correctly', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({
      type: 'object',
      properties: {
        child: {type: 'string'},
      },
    });

    const rootSchema = visitor.schemas.find(s => s.ctx.depth === 0);
    const childSchema = visitor.schemas.find(s => s.ctx.depth === 1);
    expect(rootSchema).toBeDefined();
    expect(childSchema).toBeDefined();
    expect(childSchema!.ctx.path).toEqual(['properties', 'child']);
  });

  it('visits deeply nested schemas', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({
      type: 'object',
      properties: {
        outer: {
          type: 'object',
          properties: {
            inner: {type: 'string'},
          },
        },
      },
    });

    const innerProp = visitor.properties.find(p => p.name === 'inner');
    expect(innerProp).toBeDefined();
    expect(innerProp!.ctx.path).toEqual(['properties', 'outer', 'properties', 'inner']);
    expect(innerProp!.ctx.depth).toBe(2);
  });

  it('strict mode throws on invalid keyword value', () => {
    const visitor = new RecordingVisitor(true);
    expect(() => visitor.traverse({type: 123 as any})).toThrow(TypeError);
  });

  it('lenient mode skips invalid keyword value', () => {
    const visitor = new RecordingVisitor(false);
    expect(() => visitor.traverse({type: 123 as any})).not.toThrow();
  });

  it('strict mode throws on non-schema value', () => {
    const visitor = new RecordingVisitor(true);
    expect(() => visitor.traverse('not a schema' as any)).toThrow(TypeError);
  });

  it('lenient mode skips non-schema value', () => {
    const visitor = new RecordingVisitor(false);
    expect(() => visitor.traverse('not a schema' as any)).not.toThrow();
  });

  it('visits dependentSchemas as definitions', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({
      dependentSchemas: {
        credit_card: {required: ['billing_address']},
      },
    });

    expect(visitor.definitions).toHaveLength(1);
    expect(visitor.definitions[0].name).toBe('credit_card');
    expect(visitor.definitions[0].ctx.path).toEqual(['dependentSchemas', 'credit_card']);
  });

  it('skips array-valued dependencies, visits schema-valued ones', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({
      dependencies: {
        name: ['address'],
        address: {required: ['city']},
      },
    } as any);

    expect(visitor.definitions).toHaveLength(1);
    expect(visitor.definitions[0].name).toBe('address');
  });

  it('visits $dynamicRef and $recursiveRef', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({$dynamicRef: '#myAnchor'} as any);
    expect(visitor.refs).toHaveLength(1);
    expect(visitor.refs[0].ref).toBe('#myAnchor');

    const visitor2 = new RecordingVisitor();
    visitor2.traverse({$recursiveRef: '#'} as any);
    expect(visitor2.refs).toHaveLength(1);
    expect(visitor2.refs[0].ref).toBe('#');
  });

  it('handles prefixItems', () => {
    const visitor = new RecordingVisitor();
    visitor.traverse({type: 'array', prefixItems: [{type: 'string'}, {type: 'number'}]} as any);

    const prefixItemKeywords = visitor.subSchemaKeywords.filter(k => k.keyword === 'prefixItems');
    expect(prefixItemKeywords).toHaveLength(2);
    expect(prefixItemKeywords[0].ctx.path).toEqual(['prefixItems', 0]);
    expect(prefixItemKeywords[1].ctx.path).toEqual(['prefixItems', 1]);
  });
});
