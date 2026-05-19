import {describe, expect, it, vi} from 'vitest';
import {resolveCorrespondingComponent} from '@/components/panels/gui-editor/resolveCorrespondingComponent';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {SessionMode} from '@/store/sessionMode';
import type {ConfigTreeNodeData} from '@/components/panels/gui-editor/configDataTreeNode';
import StringProperty from '@/components/panels/gui-editor/properties/StringProperty.vue';
import EnumProperty from '@/components/panels/gui-editor/properties/EnumProperty.vue';
import BooleanProperty from '@/components/panels/gui-editor/properties/BooleanProperty.vue';
import NumberProperty from '@/components/panels/gui-editor/properties/NumberProperty.vue';
import SimpleObjectProperty from '@/components/panels/gui-editor/properties/SimpleObjectProperty.vue';
import DateProperty from '@/components/panels/gui-editor/properties/DateProperty.vue';
import OntologyUriProperty from '@/components/panels/gui-editor/properties/OntologyUriProperty.vue';
import OneOfSelectionProperty from '@/components/panels/gui-editor/properties/OneOfSelectionProperty.vue';
import AnyOfSelectionProperty from '@/components/panels/gui-editor/properties/AnyOfSelectionProperty.vue';

vi.mock('@/data/useDataLink', () => ({
  getDataForMode: vi.fn(() => ({
    dataAt: vi.fn(() => undefined),
  })),
  getSessionForMode: vi.fn(() => ({
    isExpanded: vi.fn(() => false),
  })),
  getValidationForMode: vi.fn(() => ({
    currentValidationResult: {
      value: {
        filterForPath: vi.fn(() => ({})),
      },
    },
  })),
}));

function createNodeData(schema: object): ConfigTreeNodeData {
  return {
    name: 'foo',
    schema: new JsonSchemaWrapper(schema, SessionMode.DataEditor, false),
    parentSchema: undefined,
    relativePath: ['foo'],
    absolutePath: ['foo'],
    depth: 0,
  };
}

describe('resolveCorrespondingComponent', () => {
  it('resolves enum schemas to enum property', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        enum: ['a', 'b'],
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(EnumProperty);
  });

  it('resolves type unions to oneOf selection', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: ['string', 'number'],
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(OneOfSelectionProperty);
  });

  it('does not show oneOf selection for validation-only differences', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'string',
        oneOf: [{maxLength: 30}, {minLength: 50}],
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(StringProperty);
  });

  it('does not show anyOf selection for validation-only differences', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'string',
        anyOf: [{maxLength: 30}, {pattern: '^foo'}],
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(StringProperty);
  });

  it('keeps oneOf selection when the GUI-relevant schema differs', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        oneOf: [{type: 'string'}, {type: 'number'}],
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(OneOfSelectionProperty);
  });

  it('keeps anyOf selection when the GUI-relevant schema differs', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        anyOf: [{type: 'string'}, {type: 'array', items: {type: 'string'}}],
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(AnyOfSelectionProperty);
  });

  it('resolves examples on string schemas to enum property', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'string',
        examples: ['a', 'b'],
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(EnumProperty);
  });

  it('resolves ontology uri schemas to ontology uri property', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'string',
        metaConfigurator: {
          ontology: {
            mustBeUri: true,
          },
        },
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(OntologyUriProperty);
  });

  it('resolves date formatted strings to date property', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'string',
        format: 'date',
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(DateProperty);
  });

  it('resolves plain strings to string property', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'string',
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(StringProperty);
  });

  it('resolves booleans to boolean property', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'boolean',
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(BooleanProperty);
  });

  it('resolves numbers to number property', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'number',
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(NumberProperty);
  });

  it('resolves objects to simple object property', () => {
    const vnode = resolveCorrespondingComponent(
      createNodeData({
        type: 'object',
        properties: {
          child: {
            type: 'string',
          },
        },
      }),
      SessionMode.DataEditor
    );

    expect(vnode.type).toBe(SimpleObjectProperty);
  });
});
