import {describe, expect, it} from 'vitest';
import {PropertySorting} from '@/settings/settingsTypes';
import {
  childrenInAlphabeticalOrder,
  childrenInDataOrder,
  childrenInPriorityOrder,
  childrenInSchemaOrder,
  sortObjectChildren,
} from '@/components/panels/gui-editor/sortingUtils';

// The sort strategies only ever read `node.data.name`, so stub nodes with just that
// field are enough. We avoid importing the real GuiEditorTreeNode type to keep this
// test free of the JsonSchemaWrapper module graph (which has a runtime circular import
// that breaks in a vitest module-load context).
type StubNode = {data: {name: string}};
function makeNode(name: string): StubNode {
  return {data: {name}};
}

interface FakeSchema {
  properties: Record<string, {deprecated?: boolean}>;
  required: string[];
  isRequired(key: string): boolean;
}

function makeSchema(
  properties: Record<string, {deprecated?: boolean}>,
  required: string[] = []
): FakeSchema {
  return {
    properties,
    required,
    isRequired: (key: string) => required.includes(key),
  };
}

/**
 * Builds the two child-builder callbacks the sort strategies use. `schemaKeys` are the
 * keys defined under the schema's `properties`; `dataKeys` are the keys present in the
 * data. Each builder respects the filter passed to it.
 */
function builders(schemaKeys: string[], dataKeys: string[]) {
  const buildSchemaChildren = (filter: (key: string) => boolean) =>
    schemaKeys.filter(filter).map(makeNode) as any;
  const buildDataChildren = (filter: (key: string) => boolean) =>
    dataKeys.filter(filter).map(makeNode) as any;
  return {buildSchemaChildren, buildDataChildren};
}

function namesOf(nodes: any[]): string[] {
  return nodes.map(n => String(n.data.name));
}

describe('sortObjectChildren — schema order', () => {
  it('returns schema-declared properties first, then data-only keys', () => {
    const schema = makeSchema({name: {}, age: {}, zip: {}}) as any;
    const {buildSchemaChildren, buildDataChildren} = builders(
      ['name', 'age', 'zip'],
      ['name', 'extra1', 'extra2']
    );

    const result = childrenInSchemaOrder(schema, buildSchemaChildren, buildDataChildren);

    expect(namesOf(result)).toEqual(['name', 'age', 'zip', 'extra1', 'extra2']);
  });

  it('drops data keys that already exist in the schema', () => {
    const schema = makeSchema({name: {}}) as any;
    const {buildSchemaChildren, buildDataChildren} = builders(['name'], ['name', 'extra']);

    const result = childrenInSchemaOrder(schema, buildSchemaChildren, buildDataChildren);

    expect(namesOf(result)).toEqual(['name', 'extra']);
  });

  it('is dispatched by sortObjectChildren for PropertySorting.SCHEMA_ORDER', () => {
    const schema = makeSchema({b: {}, a: {}}) as any;
    const {buildSchemaChildren, buildDataChildren} = builders(['b', 'a'], []);

    const result = sortObjectChildren(
      PropertySorting.SCHEMA_ORDER,
      schema,
      buildSchemaChildren,
      buildDataChildren
    );

    expect(namesOf(result)).toEqual(['b', 'a']);
  });
});

describe('sortObjectChildren — data order', () => {
  it('returns data properties first, then any remaining schema-only properties', () => {
    const {buildSchemaChildren, buildDataChildren} = builders(
      ['alpha', 'beta', 'gamma'],
      ['gamma', 'extra']
    );

    const result = childrenInDataOrder(buildSchemaChildren, buildDataChildren);

    // gamma comes from data first, then schema-only alpha/beta in schema order
    expect(namesOf(result)).toEqual(['gamma', 'extra', 'alpha', 'beta']);
  });

  it('is dispatched by sortObjectChildren for PropertySorting.DATA_ORDER', () => {
    const schema = makeSchema({a: {}}) as any;
    const {buildSchemaChildren, buildDataChildren} = builders(['a'], ['z']);

    const result = sortObjectChildren(
      PropertySorting.DATA_ORDER,
      schema,
      buildSchemaChildren,
      buildDataChildren
    );

    expect(namesOf(result)).toEqual(['z', 'a']);
  });
});

describe('sortObjectChildren — priority order', () => {
  it('groups required, optional, additional (data-only), deprecated', () => {
    const schema = makeSchema(
      {
        reqA: {},
        optB: {},
        depC: {deprecated: true},
        depReqD: {deprecated: true}, // required + deprecated should be required
      },
      ['reqA', 'depReqD']
    ) as any;
    const {buildSchemaChildren, buildDataChildren} = builders(
      ['reqA', 'optB', 'depC', 'depReqD'],
      ['reqA', 'optB', 'extra']
    );

    const result = childrenInPriorityOrder(schema, buildSchemaChildren, buildDataChildren);

    // required (reqA, depReqD because it's required even though deprecated), then optional (optB),
    // then additional (extra), then deprecated-but-not-required (depC).
    expect(namesOf(result)).toEqual(['reqA', 'depReqD', 'optB', 'extra', 'depC']);
  });

  it('is dispatched by sortObjectChildren for PropertySorting.PRIORITY_ORDER', () => {
    const schema = makeSchema({a: {}, b: {}}, ['b']) as any;
    const {buildSchemaChildren, buildDataChildren} = builders(['a', 'b'], []);

    const result = sortObjectChildren(
      PropertySorting.PRIORITY_ORDER,
      schema,
      buildSchemaChildren,
      buildDataChildren
    );

    expect(namesOf(result)).toEqual(['b', 'a']);
  });
});

describe('sortObjectChildren — alphabetical order', () => {
  it('merges schema and data-only children into a single alphabetical list', () => {
    const schema = makeSchema({zebra: {}, mango: {}}) as any;
    const {buildSchemaChildren, buildDataChildren} = builders(
      ['zebra', 'mango'],
      ['mango', 'apple', 'kiwi']
    );

    const result = childrenInAlphabeticalOrder(schema, buildSchemaChildren, buildDataChildren);

    expect(namesOf(result)).toEqual(['apple', 'kiwi', 'mango', 'zebra']);
  });

  it('is dispatched by sortObjectChildren for PropertySorting.ALPHABETICAL_ORDER', () => {
    const schema = makeSchema({zebra: {}, apple: {}}) as any;
    const {buildSchemaChildren, buildDataChildren} = builders(['zebra', 'apple'], []);

    const result = sortObjectChildren(
      PropertySorting.ALPHABETICAL_ORDER,
      schema,
      buildSchemaChildren,
      buildDataChildren
    );

    expect(namesOf(result)).toEqual(['apple', 'zebra']);
  });
});
