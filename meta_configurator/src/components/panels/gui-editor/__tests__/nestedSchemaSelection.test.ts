import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {
  compositionKinds as compositions,
  selectionField as field,
  selectionSchema as choice,
} from '../../../../../../tests/shared/schemaSelectionFixtures';
import type {GuiEditorTreeNode} from '@/components/panels/gui-editor/configDataTreeNode';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import type {Path} from '@/utility/path';
import {installWorkerTestDouble} from '@/data/__tests__/managedValidationTestUtils';

installWorkerTestDouble();
vi.mock('@/data/managedValidation', async () => {
  const {createManagedValidationModuleTestDouble} = await import(
    '@/data/__tests__/managedValidationTestUtils'
  );
  return createManagedValidationModuleTestDouble();
});

let link: typeof import('@/data/useDataLink');
let JsonSchemaWrapper: typeof import('@/schema/jsonSchemaWrapper').JsonSchemaWrapper;
let Resolver: typeof import('@/components/panels/gui-editor/configTreeNodeResolver').ConfigTreeNodeResolver;
let Option: typeof import('@/data/oneOfAnyOfSelectionOption').OneOfAnyOfSelectionOption;
let SessionMode: typeof import('@/store/sessionMode').SessionMode;
let useDataSource: typeof import('@/data/dataSource').useDataSource;
let mode: import('@/store/sessionMode').SessionMode;
let resolver: InstanceType<typeof Resolver>;

type Kind = 'oneOf' | 'anyOf' | 'type';

beforeAll(async () => {
  setActivePinia(createPinia());
  link = await import('@/data/useDataLink');
  ({JsonSchemaWrapper} = await import('@/schema/jsonSchemaWrapper'));
  ({ConfigTreeNodeResolver: Resolver} = await import(
    '@/components/panels/gui-editor/configTreeNodeResolver'
  ));
  ({OneOfAnyOfSelectionOption: Option} = await import('@/data/oneOfAnyOfSelectionOption'));
  ({SessionMode} = await import('@/store/sessionMode'));
  ({useDataSource} = await import('@/data/dataSource'));
});

beforeEach(() => {
  mode = SessionMode.DataEditor;
  resolver = new Resolver();
  for (const sessionMode of Object.values(SessionMode)) {
    const selection = link.getUserSelectionForMode(sessionMode);
    selection.currentSelectedOneOfOptions.value.clear();
    selection.currentSelectedAnyOfOptions.value.clear();
    selection.currentSelectedTypeUnionOptions.value.clear();
  }
  link.getDataForMode(mode).setData({});
});

function node(schema: JsonSchemaType, path: Path = ['model']) {
  return resolver.createTreeNodeOfProperty(
    mode,
    new JsonSchemaWrapper(schema, mode),
    undefined,
    path
  );
}
function key(node: GuiEditorTreeNode): string {
  expect(node.data).toHaveProperty('schemaSelectionKey');
  return (node.data as {schemaSelectionKey: string}).schemaSelectionKey;
}
function select(node: GuiEditorTreeNode, kind: Kind, ...indices: number[]) {
  const store = link.getUserSelectionForMode(mode);
  const options = indices.map(index => new Option(`option ${index}`, index));
  if (kind === 'anyOf') store.setSelectedAnyOfOptions(key(node), options);
  else if (kind === 'oneOf') {
    if (options.length) store.setSelectedOneOfOption(key(node), options[0]!);
    else store.currentSelectedOneOfOptions.value.delete(key(node));
  } else {
    if (options.length) store.setSelectedTypeUnionOption(key(node), options[0]!);
    else store.currentSelectedTypeUnionOptions.value.delete(key(node));
  }
}
function children(node: GuiEditorTreeNode) {
  return resolver.createChildNodesOfNode(mode, node);
}
function selectedChild(node: GuiEditorTreeNode) {
  const result = children(node);
  expect(result).toHaveLength(1);
  return result[0]!;
}
function names(node: GuiEditorTreeNode) {
  return children(node).map(child => child.data.name);
}
function property(node: GuiEditorTreeNode, name: string | number): GuiEditorTreeNode {
  const result = children(node).find(child => child.data.name === name);
  expect(result, `missing property ${name}`).toBeDefined();
  return result!;
}

// Use the keys produced by the resolver, not an expected string format: these tests
// should survive changing the encoding while still checking observable fields/state.
describe.each(compositions)('%s parent', outerKind => {
  it.each(compositions)(
    'isolates nested %s selection, deselection, and a higher option index',
    innerKind => {
      const parent = node(choice(outerKind, [choice(innerKind), {type: 'null'}]));
      select(parent, outerKind, 0);
      const inner = selectedChild(parent);
      expect(children(inner)).toHaveLength(0);
      select(inner, innerKind, 1);
      expect(names(selectedChild(selectedChild(parent)))).toContain('b');
      select(inner, innerKind);
      const cleared = selectedChild(parent);
      expect(children(cleared)).toHaveLength(0);
      select(inner, innerKind, 2);
      expect(names(selectedChild(selectedChild(parent)))).toContain('c');
    }
  );

  it('restores the inner choice after switching to null and back', () => {
    const parent = node(choice(outerKind, [choice(outerKind), {type: 'null'}]));
    select(parent, outerKind, 0);
    select(selectedChild(parent), outerKind, 2);
    select(parent, outerKind, 1);
    expect(children(selectedChild(parent))).toHaveLength(0);
    select(parent, outerKind, 0);
    expect(names(selectedChild(selectedChild(parent)))).toContain('c');
  });

  it.each(['property', 'array', 'pattern', 'additional', 'advanced'] as const)(
    'does not reuse a different branch selection through a %s child',
    container => {
      const wrap = (schema: JsonSchemaType): JsonSchemaType => {
        if (container === 'array') return {type: 'array', items: schema};
        if (container === 'pattern')
          return {type: 'object', patternProperties: {'^config$': schema}};
        if (container === 'additional') return {type: 'object', additionalProperties: schema};
        return {
          type: 'object',
          properties: {
            config:
              container === 'advanced'
                ? {...(schema as object), metaConfigurator: {advanced: true}}
                : schema,
          },
        };
      };
      link.getDataForMode(mode).setData({
        model: container === 'array' ? [{}] : container === 'advanced' ? {} : {config: {}},
      });
      const parent = node(
        choice(outerKind, [wrap(choice('anyOf')), wrap(choice('anyOf', [field('x'), field('y')]))])
      );
      const inner = () => {
        let branch = selectedChild(parent);
        if (container === 'advanced') {
          branch = children(branch).find(child => child.type === 'advancedProperty')!;
          expect(branch).toBeDefined();
        }
        return property(branch, container === 'array' ? 0 : 'config');
      };
      select(parent, outerKind, 0);
      select(inner(), 'anyOf', 2);
      expect(names(selectedChild(inner()))).toContain('c');
      select(parent, outerKind, 1);
      expect(children(inner()), 'the new branch has no explicit selection').toHaveLength(0);
      select(inner(), 'anyOf', 1);
      expect(names(selectedChild(inner()))).toContain('y');
      select(parent, outerKind, 0);
      expect(names(selectedChild(inner()))).toContain('c');
    }
  );
});

it('keeps three composition steps independent at the document root', () => {
  const parent = node(
    choice('anyOf', [choice('oneOf', [choice('anyOf'), {type: 'null'}]), {type: 'null'}]),
    []
  );
  select(parent, 'anyOf', 0);
  select(selectedChild(parent), 'oneOf', 0);
  select(selectedChild(selectedChild(parent)), 'anyOf', 2);
  expect(names(selectedChild(selectedChild(selectedChild(parent))))).toContain('c');
});

it.each(compositions)('keeps a type union inside %s independent', kind => {
  const parent = node(
    choice(kind, [{type: ['object', 'null'], properties: {a: {type: 'string'}}}, {type: 'string'}])
  );
  select(parent, kind, 0);
  const union = selectedChild(parent);
  select(union, 'type', union.data.schema.type.indexOf('object'));
  expect(names(selectedChild(union))).toContain('a');
  select(union, 'type', union.data.schema.type.indexOf('null'));
  expect(children(selectedChild(union))).toHaveLength(0);
  expect(selectedChild(parent).data.schema.type).toContain('object');
});

it.each(compositions)('resolves %s before a type union, matching the displayed selector', kind => {
  const parent = node({type: ['object', 'null'], [kind]: [field('a'), field('b')]});
  // A prior schema at this location may have left a type-union choice. The GUI
  // currently displays the composition selector, so that is the step to resolve.
  select(parent, 'type', parent.data.schema.type.indexOf('object'));
  expect(children(parent)).toHaveLength(0);
  select(parent, kind, 1);
  expect(names(selectedChild(parent))).toContain('b');
});

it('resolves oneOf before a sibling anyOf rather than producing two parallel branches', () => {
  const parent = node({
    oneOf: [
      {title: 'A', required: ['x']},
      {title: 'B', required: ['y']},
    ],
    anyOf: [
      {type: 'object', properties: {a: {type: 'string'}}},
      {type: 'object', properties: {b: {type: 'string'}}},
    ],
  });
  select(parent, 'oneOf', 0);
  select(parent, 'anyOf', 1);
  // The root GUI displays oneOf; the remaining anyOf belongs to its selected child.
  const inner = selectedChild(parent);
  expect(inner.data.schema.anyOf).toHaveLength(2);
  expect(children(inner)).toHaveLength(0);
  select(inner, 'anyOf', 1);
  expect(names(selectedChild(inner))).toContain('b');
});

it('keeps nested anyOf multi-selection independent of option click order', () => {
  // Compatible branches; their nested anyOf constraints are merged by the resolver.
  const parent = node(
    choice('anyOf', [choice('anyOf'), {type: 'object', description: 'compatible'}])
  );
  select(parent, 'anyOf', 0, 1);
  select(selectedChild(parent), 'anyOf', 2);
  expect(names(selectedChild(selectedChild(parent)))).toContain('c');
  select(parent, 'anyOf', 1, 0);
  expect(names(selectedChild(selectedChild(parent)))).toContain('c');
});

it('isolates different anyOf selection sets and restores their choices', () => {
  const parent = node(
    choice('anyOf', [choice('anyOf'), {type: 'object', description: 'compatible'}])
  );
  select(parent, 'anyOf', 0);
  select(selectedChild(parent), 'anyOf', 1);
  select(parent, 'anyOf', 0, 1);
  expect(children(selectedChild(parent))).toHaveLength(0);
  select(selectedChild(parent), 'anyOf', 2);
  select(parent, 'anyOf', 0);
  expect(names(selectedChild(selectedChild(parent)))).toContain('b');
});

it('isolates sibling properties and separate array instances', () => {
  link.getDataForMode(mode).setData({model: {left: [{}, {}], right: [{}]}});
  const array: JsonSchemaType = {type: 'array', items: choice('anyOf')};
  const root = node({type: 'object', properties: {left: array, right: array}});
  const left = property(root, 'left');
  const first = property(left, 0);
  select(first, 'anyOf', 2);
  expect(names(selectedChild(first))).toContain('c');
  expect(children(property(left, 1))).toHaveLength(0);
  expect(children(property(property(root, 'right'), 0))).toHaveLength(0);
});

it.each(['model|anyOf:0', 'model|oneOf:0'])(
  'isolates the literal property %s from a nested selector',
  literal => {
    const kind = literal.includes('anyOf') ? 'anyOf' : 'oneOf';
    const root = node(
      {
        type: 'object',
        properties: {model: choice(kind, [choice(kind), {type: 'null'}]), [literal]: choice(kind)},
      },
      []
    );
    const parent = property(root, 'model');
    select(parent, kind, 0);
    select(selectedChild(parent), kind, 2);
    expect(children(property(root, literal))).toHaveLength(0);
  }
);

it.each([
  [['a.b'], ['a', 'b']],
  [['a[0]'], ['a', 0]],
  [[''], []],
] as [Path, Path][])('isolates ambiguous display paths %j and %j', (firstPath, secondPath) => {
  const first = node(choice('anyOf'), firstPath);
  const second = node(choice('anyOf'), secondPath);
  select(first, 'anyOf', 2);
  expect(children(second)).toHaveLength(0);
});

it('isolates selections between editor session modes', () => {
  const parent = node(choice('anyOf', [choice('anyOf'), {type: 'null'}]));
  select(parent, 'anyOf', 0);
  select(selectedChild(parent), 'anyOf', 2);
  mode = SessionMode.SchemaEditor;
  expect(children(node(choice('anyOf', [choice('anyOf'), {type: 'null'}])))).toHaveLength(0);
  mode = SessionMode.Settings;
  expect(children(node(choice('anyOf', [choice('anyOf'), {type: 'null'}])))).toHaveLength(0);
  mode = SessionMode.DataEditor;
  expect(names(selectedChild(selectedChild(parent)))).toContain('c');
});

it.each(compositions)('preserves nested %s fields when zooming and resolving descendants', kind => {
  useDataSource().userSchemaData.value = {
    type: 'object',
    properties: {model: choice(kind, [choice(kind), {type: 'null'}])},
  };
  link.getSchemaForMode(mode).reloadSchema();
  link.getDataForMode(mode).setData({model: {}});
  const root = resolver.createTreeNodeOfProperty(
    mode,
    link.getSchemaForMode(mode).effectiveSchemaAtPath([]).schema
  );
  const parent = property(root, 'model');
  select(parent, kind, 0);
  select(selectedChild(parent), kind, 1);
  expect(names(selectedChild(selectedChild(parent)))).toContain('b');
  const effective = link.getSchemaForMode(mode).effectiveSchemaAtPath(['model']);
  let zoomed = resolver.createTreeNodeOfProperty(mode, effective.schema, undefined, ['model']);
  // Match the GUI's recursive expansion, with a bound so a cycle fails clearly.
  for (
    let step = 0;
    step < 5 && (zoomed.data.schema.oneOf.length || zoomed.data.schema.anyOf.length);
    step++
  ) {
    zoomed = selectedChild(zoomed);
  }
  expect(names(zoomed)).toContain('b');
  expect(
    link.getSchemaForMode(mode).effectiveSchemaAtPath(['model', 'b']).schema.hasType('string')
  ).toBe(true);
});

it.each(['allOf', '$ref', 'conditional'] as const)(
  'preserves nested selections exposed through %s processing',
  wrapper => {
    const nested = choice('anyOf', [choice('oneOf'), {type: 'null'}]);
    const model =
      wrapper === 'allOf'
        ? {allOf: [nested, {description: 'shared'}]}
        : wrapper === '$ref'
        ? {$ref: '#/$defs/model'}
        : {if: {type: 'object'}, then: nested, else: {type: 'null'}};
    useDataSource().userSchemaData.value = {
      type: 'object',
      $defs: {model: nested},
      properties: {model},
    };
    link.getSchemaForMode(mode).reloadSchema();
    link.getDataForMode(mode).setData({model: {}});
    const build = () =>
      property(
        resolver.createTreeNodeOfProperty(
          mode,
          link.getSchemaForMode(mode).effectiveSchemaAtPath([]).schema
        ),
        'model'
      );
    const parent = build();
    select(parent, 'anyOf', 0);
    select(selectedChild(parent), 'oneOf', 2);
    expect(names(selectedChild(selectedChild(build())))).toContain('c');
  }
);

it('clearing all outer anyOf choices preserves the inner choice for reselection', () => {
  const schema = choice('anyOf', [choice('anyOf'), {type: 'null'}]);
  const parent = node(schema);
  select(parent, 'anyOf', 0);
  select(selectedChild(parent), 'anyOf', 2);
  select(parent, 'anyOf');
  expect(children(parent)).toHaveLength(0);
  expect(node(schema).leaf).toBe(true);
  select(parent, 'anyOf', 0);
  // Rebuilding all node objects must not erase the selection.
  expect(names(selectedChild(selectedChild(node(schema))))).toContain('c');
});

it('an incompatible nested anyOf combination does not collapse the outer selector', () => {
  const parent = node(
    choice('anyOf', [choice('anyOf', [{type: 'string'}, {type: 'number'}]), {type: 'null'}])
  );
  select(parent, 'anyOf', 0);
  const inner = selectedChild(parent);
  select(inner, 'anyOf', 0, 1);
  expect(children(inner)).toHaveLength(0);
  expect(selectedChild(parent).data.schema.anyOf).toHaveLength(2);
  select(inner, 'anyOf', 1);
  expect(selectedChild(selectedChild(parent)).data.schema.hasType('number')).toBe(true);
});

it('selects multiple compatible inner anyOf options without selecting a parent option', () => {
  const innerSchema = choice('anyOf', [
    {type: 'object', properties: {a: {type: 'string'}}},
    {type: 'object', properties: {b: {type: 'string'}}},
    {type: 'object', properties: {c: {type: 'string'}}},
  ]);
  const parent = node(choice('anyOf', [innerSchema, {type: 'null'}]));
  select(parent, 'anyOf', 0);
  select(selectedChild(parent), 'anyOf', 0, 2);
  expect(names(selectedChild(selectedChild(parent)))).toEqual(expect.arrayContaining(['a', 'c']));
  expect(names(selectedChild(selectedChild(parent)))).not.toContain('b');
});

it.each(compositions)('preserves %s ancestry when zooming into a child selector', kind => {
  useDataSource().userSchemaData.value = {
    type: 'object',
    properties: {
      model: choice(kind, [
        {type: 'object', properties: {config: choice('anyOf')}},
        {type: 'null'},
      ]),
    },
  };
  link.getSchemaForMode(mode).reloadSchema();
  link.getDataForMode(mode).setData({model: {}});
  const root = resolver.createTreeNodeOfProperty(
    mode,
    link.getSchemaForMode(mode).effectiveSchemaAtPath([], false).schema
  );
  const parent = property(root, 'model');
  select(parent, kind, 0);
  const inner = property(selectedChild(parent), 'config');
  select(inner, 'anyOf', 1);
  const path = ['model', 'config'];
  const effective = link.getSchemaForMode(mode).effectiveSchemaAtPath(path, false);
  const zoomed = resolver.createTreeNodeOfProperty(
    mode,
    effective.schema,
    undefined,
    path,
    [],
    0,
    undefined,
    effective.schemaSelectionKey
  );
  expect(key(zoomed)).toBe(key(inner));
  expect(names(selectedChild(zoomed))).toContain('b');
  select(zoomed, 'anyOf', 2);
  expect(names(selectedChild(inner))).toContain('c');
});
