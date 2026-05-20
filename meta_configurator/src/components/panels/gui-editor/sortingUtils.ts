import type {GuiEditorTreeNode} from '@/components/panels/gui-editor/configDataTreeNode';
import {PropertySorting} from '@/settings/settingsTypes';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';

/*
 * Sorting utilities used by the GUI editor TreeTable and by the schema-editor "Sort
 * Alphabetically" toolbar action. Two flavours live here:
 *
 *   - sortObjectChildren(...) and the four childrenIn*Order functions: arrange the
 *     children of a single object node based on the configured PropertySorting mode.
 *   - sortSchemaPropertiesAlphabetically(...): walk an entire JSON schema and return a
 *     new schema in which every property-map keyword has its keys alphabetized.
 */

/** Builds the children that come from the schema's `properties`. */
export type SchemaChildrenBuilder = (filter: (key: string) => boolean) => GuiEditorTreeNode[];

/** Builds the children that come from keys present in the data. */
export type DataChildrenBuilder = (filter: (key: string) => boolean) => GuiEditorTreeNode[];

/**
 * Returns the children of an object node in the order chosen by `propertySorting`.
 */
export function sortObjectChildren(
  propertySorting: PropertySorting,
  schema: JsonSchemaWrapper,
  buildSchemaChildren: SchemaChildrenBuilder,
  buildDataChildren: DataChildrenBuilder
): GuiEditorTreeNode[] {
  switch (propertySorting) {
    case PropertySorting.SCHEMA_ORDER:
      return childrenInSchemaOrder(schema, buildSchemaChildren, buildDataChildren);
    case PropertySorting.DATA_ORDER:
      return childrenInDataOrder(buildSchemaChildren, buildDataChildren);
    case PropertySorting.PRIORITY_ORDER:
      return childrenInPriorityOrder(schema, buildSchemaChildren, buildDataChildren);
    case PropertySorting.ALPHABETICAL_ORDER:
      return childrenInAlphabeticalOrder(schema, buildSchemaChildren, buildDataChildren);
    default:
      return [];
  }
}

/**
 * Schema-declared properties first (in schema declaration order), followed by any
 * extra keys present in the data that the schema does not declare.
 */
export function childrenInSchemaOrder(
  schema: JsonSchemaWrapper,
  buildSchemaChildren: SchemaChildrenBuilder,
  buildDataChildren: DataChildrenBuilder
): GuiEditorTreeNode[] {
  const schemaProperties = buildSchemaChildren(() => true);
  const dataProperties = buildDataChildren(key => !schema.properties || !schema.properties[key]);
  return schemaProperties.concat(dataProperties);
}

/**
 * Properties in the order they appear in the data, followed by any
 * schema-declared properties that are not present in the data.
 */
export function childrenInDataOrder(
  buildSchemaChildren: SchemaChildrenBuilder,
  buildDataChildren: DataChildrenBuilder
): GuiEditorTreeNode[] {
  const dataProperties = buildDataChildren(() => true);
  const schemaProperties = buildSchemaChildren(
    key => !dataProperties.find(node => node.data.name === key)
  );
  return dataProperties.concat(schemaProperties);
}

/**
 * Required schema properties first, then optional ones, then additional (data-only)
 * properties, then deprecated ones.
 */
export function childrenInPriorityOrder(
  schema: JsonSchemaWrapper,
  buildSchemaChildren: SchemaChildrenBuilder,
  buildDataChildren: DataChildrenBuilder
): GuiEditorTreeNode[] {
  const requiredProperties = buildSchemaChildren(key => schema.isRequired(key));
  const optionalProperties = buildSchemaChildren(
    key => !schema.isRequired(key) && !schema.properties[key]?.deprecated
  );
  const additionalProperties = buildDataChildren(
    key => !schema.properties || !schema.properties[key]
  );
  const deprecatedProperties = buildSchemaChildren(
    key => !!schema.properties[key]?.deprecated && !schema.isRequired(key)
  );
  return requiredProperties.concat(optionalProperties, additionalProperties, deprecatedProperties);
}

/**
 * All children (schema-declared and extra data-only keys) merged into a single list
 * sorted alphabetically by name.
 */
export function childrenInAlphabeticalOrder(
  schema: JsonSchemaWrapper,
  buildSchemaChildren: SchemaChildrenBuilder,
  buildDataChildren: DataChildrenBuilder
): GuiEditorTreeNode[] {
  const schemaProperties = buildSchemaChildren(() => true);
  const dataProperties = buildDataChildren(key => !schema.properties || !schema.properties[key]);
  return schemaProperties
    .concat(dataProperties)
    .sort((a, b) => String(a.data.name).localeCompare(String(b.data.name)));
}

/**
 * Returns a new schema with every object's keys sorted alphabetically (recursively).
 * Arrays are walked but their order is preserved. The input is not mutated.
 */
export function sortSchemaPropertiesAlphabetically<T>(schema: T): T {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(item => sortSchemaPropertiesAlphabetically(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(schema).sort()) {
    result[key] = sortSchemaPropertiesAlphabetically((schema as Record<string, any>)[key]);
  }
  return result as T;
}
