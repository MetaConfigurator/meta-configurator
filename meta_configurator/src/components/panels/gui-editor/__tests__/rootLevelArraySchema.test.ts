/**
 * Regression test for the "schema with type array on root level does not work" bug:
 * - With the default document data (an empty object), the GUI editor tree contained no
 *   nodes at all for a root-level array schema, so the array could never be filled.
 * - Node keys of root-level array items were malformed ("0]" instead of "[0]", see
 *   pathToString), which broke data writes for those paths.
 *
 * This test builds the GUI editor tree the same way the PropertiesPanel does.
 */
import {beforeAll, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {installWorkerTestDouble} from '@/data/__tests__/managedValidationTestUtils';

installWorkerTestDouble();

vi.mock('@/data/managedValidation', async () => {
  const {createManagedValidationModuleTestDouble} = await import(
    '@/data/__tests__/managedValidationTestUtils'
  );
  return createManagedValidationModuleTestDouble();
});

let SessionMode: any;
let useDataSource: any;
let getSchemaForMode: any;
let getDataForMode: any;
let getSessionForMode: any;
let ConfigTreeNodeResolver: any;
let TreeNodeType: any;

beforeAll(async () => {
  setActivePinia(createPinia());
  SessionMode = (await import('@/store/sessionMode')).SessionMode;
  useDataSource = (await import('@/data/dataSource')).useDataSource;
  const dataLink = await import('@/data/useDataLink');
  getSchemaForMode = dataLink.getSchemaForMode;
  getDataForMode = dataLink.getDataForMode;
  getSessionForMode = dataLink.getSessionForMode;
  ConfigTreeNodeResolver = (await import('@/components/panels/gui-editor/configTreeNodeResolver'))
    .ConfigTreeNodeResolver;
  TreeNodeType = (await import('@/components/panels/gui-editor/configDataTreeNode')).TreeNodeType;

  useDataSource().userSchemaData.value = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: {type: 'string'},
      },
    },
  };
  getSchemaForMode(SessionMode.DataEditor).reloadSchema();
});

function buildRootChildren(): any[] {
  const mode = SessionMode.DataEditor;
  const resolver = new ConfigTreeNodeResolver();
  const rootSchema = getSchemaForMode(mode).effectiveSchemaAtPath([]).schema;
  const root = resolver.createTreeNodeOfProperty(mode, rootSchema, undefined, []);
  return resolver.createChildNodesOfNode(mode, root);
}

describe('GUI editor tree for a schema with array type at the root level', () => {
  it('offers an add item node when the data is still the default empty object', () => {
    getDataForMode(SessionMode.DataEditor).setData({});

    const children = buildRootChildren();
    expect(children.length).toBe(1);
    expect(children[0].type).toBe(TreeNodeType.ADD_ITEM);
  });

  it('offers an add item node when the data is a non-array value (e.g. leftover data)', () => {
    getDataForMode(SessionMode.DataEditor).setData({legacy: 'value'});

    const children = buildRootChildren();
    expect(children.length).toBe(1);
    expect(children[0].type).toBe(TreeNodeType.ADD_ITEM);
  });

  it('shows one node per array item plus an add item node with well-formed keys', () => {
    getDataForMode(SessionMode.DataEditor).setData([{name: 'Alex'}, {name: 'Bob'}]);

    const children = buildRootChildren();
    expect(children.map((child: any) => child.key)).toEqual(['[0]', '[1]', '[2]']);
    expect(children[0].type).toBe(TreeNodeType.SCHEMA_PROPERTY);
    expect(children[1].type).toBe(TreeNodeType.SCHEMA_PROPERTY);
    expect(children[2].type).toBe(TreeNodeType.ADD_ITEM);
  });

  it('resolves the effective schema of array items so zooming into them works', () => {
    getDataForMode(SessionMode.DataEditor).setData([{name: 'Alex'}]);

    const effectiveSchema = getSchemaForMode(SessionMode.DataEditor).effectiveSchemaAtPath([0]);
    expect(effectiveSchema.schema.hasType('object')).toBe(true);
    expect(Object.keys(effectiveSchema.schema.properties)).toContain('name');

    // zooming in the GUI updates the current path, which must stay on the item
    const session = getSessionForMode(SessionMode.DataEditor);
    session.updateCurrentPath([0]);
    expect(session.currentPath.value).toEqual([0]);
  });

  it('writes data of root-level array items to the correct location', () => {
    const data = getDataForMode(SessionMode.DataEditor);
    data.setData([{name: 'Alex'}]);

    // replacing a whole item at a root-level index was silently dropped before
    data.setDataAt([1], {name: 'Bob'});
    expect(data.data.value).toEqual([{name: 'Alex'}, {name: 'Bob'}]);

    data.setDataAt([0, 'name'], 'Alice');
    expect(data.data.value).toEqual([{name: 'Alice'}, {name: 'Bob'}]);
  });
});
