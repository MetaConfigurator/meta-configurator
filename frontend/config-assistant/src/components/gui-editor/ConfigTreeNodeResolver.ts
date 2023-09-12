import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {
  AddPropertyTreeNode,
  ConfigDataTreeNodeType,
  GuiEditorTreeNode,
} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path} from '@/model/path';
import {useSettingsStore} from '@/store/settingsStore';
import {pathToString} from '@/helpers/pathHelper';
import {PropertySorting} from '@/model/SettingsTypes';
import {useSessionStore} from '@/store/sessionStore';
import _ from 'lodash';
import type {EffectiveSchema} from '@/helpers/schema/effectiveSchemaCalculator';
import {calculateEffectiveSchema} from '@/helpers/schema/effectiveSchemaCalculator';

/**
 * Creates a tree of {@link GuiEditorTreeNode}s from a {@link JsonSchema} and
 * the corresponding data.
 */
export class ConfigTreeNodeResolver {
  /**
   * Creates a tree of {@link GuiEditorTreeNode}s from a {@link JsonSchema} and
   * the corresponding data.
   *
   * @param schema The schema of the node.
   * @param parentSchema The schema of the parent node.
   * @param absolutePath The path of the parent node.
   * @param relativePath The path of the node relative to the parent node. Defaults to the empty path.
   * @param depth The depth of the node in the tree, starting with 0 for the root node.
   * @param nodeType The type of the node, e.g. {@link TreeNodeType.SCHEMA_PROPERTY} by default.
   */
  public createTreeNodeOfProperty(
    schema: JsonSchema,
    parentSchema?: JsonSchema,
    absolutePath: Path = [],
    relativePath: Path = [],
    depth: number = 0,
    nodeType: ConfigDataTreeNodeType = TreeNodeType.SCHEMA_PROPERTY
  ): GuiEditorTreeNode {
    const name = absolutePath[absolutePath.length - 1] ?? '';
    const parentName = absolutePath[absolutePath.length - 2] ?? '';

    return {
      data: {
        name: name,
        schema: schema,
        parentSchema: parentSchema,
        parentName: parentName,
        depth: depth,
        relativePath: relativePath,
        absolutePath: absolutePath,
      },
      type: nodeType,
      key: pathToString(absolutePath),
      children: [],
      leaf: this.isLeaf(schema, depth, absolutePath),
    };
  }

  private isLeaf(schema: JsonSchema, depth: number, absolutePath: Path): boolean {
    const dependsOnUserSelection = schema.anyOf.length > 0 || schema.oneOf.length > 0;
    if (dependsOnUserSelection) {
      const path = pathToString(absolutePath);
      const hasUserSelectionOneOf = useSessionStore().currentSelectedOneOfOptions.has(path);
      const hasUserSelectionAnyOf = useSessionStore().currentSelectedAnyOfOptions.has(path);
      if (!(hasUserSelectionOneOf || hasUserSelectionAnyOf)) {
        return true;
      }
    }

    return (
      (!schema.hasType('object') && !schema.hasType('array')) ||
      depth >= useSettingsStore().settingsData.guiEditor.maximumDepth
    );
  }

  public createChildNodesOfNode(guiEditorTreeNode: GuiEditorTreeNode): GuiEditorTreeNode[] {
    if (
      guiEditorTreeNode.type === TreeNodeType.ADD_ITEM ||
      guiEditorTreeNode.type === TreeNodeType.ADD_PROPERTY
    ) {
      return [];
    }
    const effectiveSchema = calculateEffectiveSchema(
      guiEditorTreeNode.data.schema,
      useSessionStore().dataAtPath(guiEditorTreeNode.data.absolutePath),
      guiEditorTreeNode.data.absolutePath
    );

    guiEditorTreeNode.children = this.createChildNodes(
      guiEditorTreeNode.data.absolutePath,
      guiEditorTreeNode.data.relativePath,
      effectiveSchema,
      guiEditorTreeNode.data.depth
    );
    return guiEditorTreeNode.children as GuiEditorTreeNode[];
  }

  private createChildNodes(
    absolutePath: Path,
    relativePath: Path = [],
    effectiveSchema: EffectiveSchema,
    depth = 0
  ): GuiEditorTreeNode[] {
    const depthLimit = useSettingsStore().settingsData.guiEditor.maximumDepth;
    const schema = effectiveSchema.schema;

    let children: GuiEditorTreeNode[] = [];
    if (schema.oneOf.length > 0) {
      children = this.createOneOfChildrenTreeNodes(absolutePath, relativePath, schema, depth);
    }
    if (schema.anyOf.length > 0) {
      children = children.concat(
        this.createAnyOfChildrenTreeNodes(absolutePath, relativePath, schema, depth)
      );
    }

    if (schema.anyOf.length > 0 || schema.oneOf.length > 0) {
      return children;
    }

    children = [];
    if (schema.hasType('array') && depth < depthLimit) {
      children = children.concat(
        this.createArrayChildrenTreeNodes(absolutePath, relativePath, schema, depth)
      );
    }
    if (schema.hasType('object') && depth < depthLimit) {
      children = children.concat(
        this.createObjectChildrenTreeNodes(absolutePath, relativePath, schema, depth)
      );
    }
    return children;
  }

  /**
   * Creates children nodes for an object node, sorted according to the order defined
   * in the settings.
   */
  private createObjectChildrenTreeNodes(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ) {
    const propertySorting = useSettingsStore().settingsData.guiEditor.propertySorting;
    let result: GuiEditorTreeNode[] = [];

    if (propertySorting === PropertySorting.SCHEMA_ORDER) {
      result = this.createObjectChildrenNodesAccordingToSchemaOrder(
        absolutePath,
        relativePath,
        schema,
        depth
      );
    }
    if (propertySorting === PropertySorting.DATA_ORDER) {
      result = this.createObjectChildrenNodesAccordingToDataOrder(
        absolutePath,
        relativePath,
        schema,
        depth
      );
    }

    if (propertySorting === PropertySorting.PRIORITY_ORDER) {
      result = this.createObjectChildrenNodesPriorityOrder(
        absolutePath,
        relativePath,
        schema,
        depth
      );
    }

    const data = useSessionStore().dataAtPath(absolutePath);
    if (this.shouldAddAddPropertyNode(schema, data)) {
      return result.concat(
        this.createAddPropertyTreeNode(absolutePath, relativePath, schema, depth)
      );
    }

    return result;
  }

  private createObjectChildrenNodesPriorityOrder(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ) {
    const requiredProperties = this.createPropertiesChildNodes(
      absolutePath,
      relativePath,
      schema,
      depth,
      key => schema.isRequired(key)
    );
    const optionalProperties = this.createPropertiesChildNodes(
      absolutePath,
      relativePath,
      schema,
      depth,
      key => !schema.isRequired(key) && !schema.properties[key].deprecated
    );
    const additionalProperties = this.createDataPropertiesChildNodes(
      absolutePath,
      relativePath,
      schema,
      depth,
      key => !schema.properties || !schema.properties[key]
    ); // filter out properties that are already in the schema
    const deprecatedProperties = this.createPropertiesChildNodes(
      absolutePath,
      relativePath,
      schema,
      depth,
      key => schema.properties[key].deprecated && !schema.isRequired(key)
    );
    return requiredProperties.concat(
      optionalProperties,
      additionalProperties,
      deprecatedProperties
    );
  }

  private createObjectChildrenNodesAccordingToDataOrder(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ) {
    const dataProperties = this.createDataPropertiesChildNodes(
      absolutePath,
      relativePath,
      schema,
      depth
    );
    const schemaProperties = this.createPropertiesChildNodes(
      absolutePath,
      relativePath,
      schema,
      depth,
      key => !dataProperties.find(node => node.data.name === key)
    );

    return dataProperties.concat(schemaProperties);
  }

  private createObjectChildrenNodesAccordingToSchemaOrder(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ) {
    const schemaProperties = this.createPropertiesChildNodes(
      absolutePath,
      relativePath,
      schema,
      depth
    );
    const dataProperties = this.createDataPropertiesChildNodes(
      absolutePath,
      relativePath,
      schema,
      depth,
      key => !schema.properties || !schema.properties[key]
    );
    return schemaProperties.concat(dataProperties);
  }

  private createPropertiesChildNodes(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number,
    filter: (key: string) => boolean = () => true
  ) {
    return Object.entries(schema.properties)
      .filter(([key]) => filter(key))
      .map(([key, value]) => {
        const childPath = absolutePath.concat(key);
        return this.createTreeNodeOfProperty(
          value,
          schema,
          childPath,
          relativePath.concat(key),
          depth + 1
        );
      });
  }

  private createDataPropertiesChildNodes(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number,
    filter: (key: string) => boolean = () => true
  ) {
    const data = useSessionStore().dataAtPath(absolutePath);
    if (!data) {
      return [];
    }

    return Object.entries(data)
      .filter(([key]) => filter(key))
      .map(([key]) => {
        if (schema.properties && schema.properties[key]) {
          const childPath = absolutePath.concat(key);
          return this.createTreeNodeOfProperty(
            schema.properties[key],
            schema,
            childPath,
            relativePath.concat(key),
            depth + 1
          );
        }

        let childSchema = schema.additionalProperties;
        let type = TreeNodeType.ADDITIONAL_PROPERTY;

        Object.entries(schema.patternProperties).forEach(([pattern, patternSchema]) => {
          if (new RegExp(pattern).test(key)) {
            childSchema = patternSchema;
            type = TreeNodeType.PATTERN_PROPERTY;
          }
        });

        const childPath = absolutePath.concat(key);
        return this.createTreeNodeOfProperty(
          childSchema,
          schema,
          childPath,
          relativePath.concat(key),
          depth + 1,
          type
        );
      });
  }

  private createArrayChildrenTreeNodes(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ) {
    const data = useSessionStore().dataAtPath(absolutePath);
    let children: GuiEditorTreeNode[] = [];
    if (Array.isArray(data)) {
      children = data.map((value: any, index: number) => {
        const childPath = absolutePath.concat(index);
        return this.createTreeNodeOfProperty(
          schema.items,
          schema,
          childPath,
          relativePath.concat(index),
          depth + 1
        );
      });
    }
    if (this.shouldAddAddItemNode(schema, data)) {
      return children.concat(
        this.createAddItemTreeNode(absolutePath, relativePath, schema, depth + 1, children)
      );
    }
    return children;
  }

  private createAddPropertyTreeNode(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ): AddPropertyTreeNode {
    return {
      data: {
        absolutePath: absolutePath,
        relativePath: relativePath,
        schema: schema.additionalProperties || new JsonSchema({}), // not used
        parentSchema: schema,
        name: '', // name is not used for add property node, but we keep it for easier type checking
        depth: depth,
      },
      type: TreeNodeType.ADD_PROPERTY,
      key: pathToString(absolutePath.concat('add-property')),
      children: [],
      leaf: true,
    };
  }

  private createAddItemTreeNode(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number,
    children: GuiEditorTreeNode[]
  ): GuiEditorTreeNode {
    const pathWithIndex = relativePath.concat(children.length);
    const absolutePathWithIndex = absolutePath.concat(children.length);
    return {
      data: {
        schema: schema.items,
        depth: depth,
        relativePath: pathWithIndex,
        absolutePath: absolutePathWithIndex,
        name: children.length,
      },
      type: TreeNodeType.ADD_ITEM,
      key: pathToString(absolutePathWithIndex),
      children: [],
      leaf: true,
    };
  }
  private createOneOfChildrenTreeNodes(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ) {
    const path = pathToString(absolutePath);
    const userSelectionOneOf = useSessionStore().currentSelectedOneOfOptions.get(path);

    // TODO: live merge of schema with subschema

    if (userSelectionOneOf !== undefined) {
      const subSchemaOneOf = schema.oneOf[userSelectionOneOf.index];
      const subSchema = new JsonSchema({
        allOf: [schema.jsonSchema ?? {}, subSchemaOneOf.jsonSchema ?? {}],
      });
      return [
        this.createTreeNodeOfProperty(subSchema, schema, absolutePath, relativePath, depth + 1),
      ];
    }
    return [];
  }

  private createAnyOfChildrenTreeNodes(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ) {
    const path = pathToString(absolutePath);
    const userSelectionAnyOf = useSessionStore().currentSelectedAnyOfOptions.get(path);

    // TODO: live merge of schema with subschema

    if (userSelectionAnyOf !== undefined) {
      const subSchemaAnyOf = schema.oneOf[userSelectionAnyOf[0].index]; // TODO: use all selected schema
      const subSchema = new JsonSchema({
        allOf: [schema.jsonSchema ?? {}, subSchemaAnyOf.jsonSchema ?? {}],
      });
      return [
        this.createTreeNodeOfProperty(subSchema, schema, absolutePath, relativePath, depth + 1),
      ];
    }
    return [];
  }

  private shouldAddAddPropertyNode(schema: JsonSchema, data: any) {
    if (Array.isArray(data)) {
      return false;
    }
    if (data !== undefined && typeof data !== 'object') {
      return false;
    }
    if (schema.maxProperties !== undefined && Object.keys(data).length >= schema.maxProperties) {
      return false;
    }
    return !_.isEmpty(schema.patternProperties) || !schema.additionalProperties.isAlwaysFalse;
  }

  private shouldAddAddItemNode(schema: JsonSchema, data: any) {
    if (data !== undefined && !Array.isArray(data)) {
      return false;
    }
    if (schema.maxItems !== undefined && data !== undefined && data.length >= schema.maxItems) {
      return false;
    }
    if (schema.items.isAlwaysFalse) {
      return data?.length < schema.prefixItems?.length ?? 0;
    }
    return true;
  }
}
