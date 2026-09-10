/**
 * Regression test for https://github.com/MetaConfigurator/meta-configurator/issues/1031:
 * The GUI view of the schema editor did not show the "properties" and "required" fields
 * for subschemas that were newly added to a oneOf array (their data starts as an empty
 * object, which did not match any type-specific condition of the simplified meta schema).
 *
 * This test builds the GUI editor tree the same way the PropertiesPanel does and checks
 * which fields are offered for the individual oneOf array elements.
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
let ConfigTreeNodeResolver: any;
let TreeNodeType: any;
let pathToString: any;

beforeAll(async () => {
  setActivePinia(createPinia());
  SessionMode = (await import('@/store/sessionMode')).SessionMode;
  useDataSource = (await import('@/data/dataSource')).useDataSource;
  getSchemaForMode = (await import('@/data/useDataLink')).getSchemaForMode;
  ConfigTreeNodeResolver = (await import('@/components/panels/gui-editor/configTreeNodeResolver'))
    .ConfigTreeNodeResolver;
  TreeNodeType = (await import('@/components/panels/gui-editor/configDataTreeNode')).TreeNodeType;
  pathToString = (await import('@/utility/pathUtils')).pathToString;
});

/**
 * Builds the GUI editor tree and expands it along the given path,
 * like the PropertiesPanel does when the user expands nodes.
 * Returns the node at the given path.
 */
function buildTreeAndExpandTo(mode: any, targetPath: any[]): any {
  const resolver = new ConfigTreeNodeResolver();
  const rootSchema = getSchemaForMode(mode).effectiveSchemaAtPath([]).schema;
  const root = resolver.createTreeNodeOfProperty(mode, rootSchema, undefined, []);
  root.children = resolver.createChildNodesOfNode(mode, root);

  let current = root;
  for (let length = 1; length <= targetPath.length; length++) {
    const key = pathToString(targetPath.slice(0, length));
    const next = (current.children ?? []).find((child: any) => child.key === key);
    expect(next, `tree node ${key} should exist`).toBeDefined();
    next.children = resolver.createChildNodesOfNode(mode, next);
    current = next;
  }
  return current;
}

function childNames(node: any): string[] {
  return (node.children ?? []).map((child: any) => String(child.data?.name));
}

describe('GUI fields of oneOf array elements in the schema editor', () => {
  const pathToOneOf = ['properties', 'pet', 'oneOf'];

  function setEditedSchema(oneOfElements: any[]) {
    useDataSource().userSchemaData.value = {
      type: 'object',
      properties: {
        pet: {
          oneOf: oneOfElements,
        },
      },
    };
  }

  it('shows properties and required for an existing object-like element', () => {
    setEditedSchema([{title: 'Dog', properties: {bark: {type: 'string'}}, required: ['bark']}]);
    const node = buildTreeAndExpandTo(SessionMode.SchemaEditor, [...pathToOneOf, 0]);

    expect(childNames(node)).toContain('properties');
    expect(childNames(node)).toContain('required');
  });

  it('offers the fields of an arbitrary schema for a newly added (empty) element', () => {
    setEditedSchema([
      {title: 'Dog', properties: {bark: {type: 'string'}}, required: ['bark']},
      {}, // element as created by the "add item" button
    ]);
    const node = buildTreeAndExpandTo(SessionMode.SchemaEditor, [...pathToOneOf, 1]);

    // the object specific fields from the issue report
    expect(childNames(node)).toContain('properties');
    expect(childNames(node)).toContain('required');
    // the element could still become any other type, so those fields are offered as well
    expect(childNames(node)).toContain('items');
    expect(childNames(node)).toContain('maximum');
    expect(childNames(node)).toContain('format');
  });

  it('shows properties and required for an element with explicit object type', () => {
    setEditedSchema([{type: 'object'}]);
    const node = buildTreeAndExpandTo(SessionMode.SchemaEditor, [...pathToOneOf, 0]);

    expect(childNames(node)).toContain('properties');
    expect(childNames(node)).toContain('required');
  });

  it('hides properties and required for an element with a non-object type', () => {
    setEditedSchema([{type: 'string'}]);
    const node = buildTreeAndExpandTo(SessionMode.SchemaEditor, [...pathToOneOf, 0]);

    expect(childNames(node)).not.toContain('properties');
    expect(childNames(node)).not.toContain('required');
  });

  it('infers the number type for a typeless element with number keywords', () => {
    setEditedSchema([{maximum: 5}]);
    const node = buildTreeAndExpandTo(SessionMode.SchemaEditor, [...pathToOneOf, 0]);

    // the other number fields stay offered
    expect(childNames(node)).toContain('minimum');
    expect(childNames(node)).toContain('exclusiveMaximum');
    // but the fields of the other types are hidden
    expect(childNames(node)).not.toContain('properties');
    expect(childNames(node)).not.toContain('required');
    expect(childNames(node)).not.toContain('items');
  });

  it('infers the array type for a typeless element with array keywords', () => {
    setEditedSchema([{items: {type: 'string'}}]);
    const node = buildTreeAndExpandTo(SessionMode.SchemaEditor, [...pathToOneOf, 0]);

    // "items" is recognized as a schema-defined field (not as an unknown additional property)
    const itemsChild = (node.children ?? []).find((child: any) => child.data?.name === 'items');
    expect(itemsChild?.type).toBe(TreeNodeType.SCHEMA_PROPERTY);
    // the fields of the other types are hidden
    expect(childNames(node)).not.toContain('properties');
    expect(childNames(node)).not.toContain('required');
    expect(childNames(node)).not.toContain('maximum');
  });
});
