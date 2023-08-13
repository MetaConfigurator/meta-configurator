import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {ConfigDataTreeNodeType, GuiEditorTreeNode} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path} from '@/model/path';
import {useSettingsStore} from '@/store/settingsStore';
import {pathToString} from '@/helpers/pathHelper';
import {PropertySorting} from '@/model/SettingsTypes';
import {useSessionStore} from '@/store/sessionStore';

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

    return {
      data: {
        name: name,
        schema: schema,
        parentSchema: parentSchema,
        depth: depth,
        relativePath: relativePath,
        absolutePath: absolutePath,
      },
      type: nodeType,
      key: pathToString(absolutePath),
      children: [],
      leaf: this.isLeaf(schema, absolutePath, depth),
    };
  }

  private isLeaf(schema: JsonSchema, absolutePath: Path, depth: number): boolean {
    const dependsOnUserSelection = schema.anyOf.length > 0 || schema.oneOf.length > 0;
    if (dependsOnUserSelection) {
      const path = pathToString(absolutePath);
      const hasUserSelection = useSessionStore().currentSelectedOneOfAnyOfOptions.has(path);
      if (!hasUserSelection) {
        return true;
      }
    }

    return (
      (!schema.hasType('object') && !schema.hasType('array')) ||
      depth >= useSettingsStore().settingsData.guiEditor.maximumDepth
    );
  }

  public createChildNodesOfNode(guiEditorTreeNode: GuiEditorTreeNode): GuiEditorTreeNode[] {
    guiEditorTreeNode.children = this.createChildNodes(
      guiEditorTreeNode.data.absolutePath,
      guiEditorTreeNode.data.relativePath,
      guiEditorTreeNode.data.schema,
      guiEditorTreeNode.data.depth
    );
    return guiEditorTreeNode.children as GuiEditorTreeNode[];
  }

  private createChildNodes(
    absolutePath: Path,
    relativePath: Path = [],
    schema: JsonSchema,
    depth = 0
  ): GuiEditorTreeNode[] {
    const depthLimit = useSettingsStore().settingsData.guiEditor.maximumDepth;

    let children: GuiEditorTreeNode[] = [];
    if (schema.hasType('object') && depth < depthLimit) {
      children = this.createObjectChildrenTreeNodes(absolutePath, relativePath, schema, depth);
    }
    if (schema.hasType('array') && depth < depthLimit) {
      children = this.createArrayChildrenTreeNodes(absolutePath, relativePath, schema, depth);
    }
    if (schema.oneOf.length > 0) {
      children = this.createOneOfChildrenTreeNodes(absolutePath, relativePath, schema, depth);
    }
    if (schema.anyOf.length > 0) {
      children = this.createAnyOfChildrenTreeNodes(absolutePath, relativePath, schema, depth);
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

    if (propertySorting === PropertySorting.SCHEMA_ORDER) {
      return this.createObjectChildrenNodesAccordingToSchemaOrder(
        absolutePath,
        relativePath,
        schema,
        depth
      );
    }
    if (propertySorting === PropertySorting.DATA_ORDER) {
      return this.createObjectChildrenNodesAccordingToDataOrder(
        absolutePath,
        relativePath,
        schema,
        depth
      );
    }
    // priority sorting
    return this.createObjectChildrenNodesPriorityOrder(absolutePath, relativePath, schema, depth);
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
      .map(([key, value]) =>
        this.createTreeNodeOfProperty(
          value,
          schema,
          absolutePath.concat(key),
          relativePath.concat(key),
          depth + 1
        )
      );
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
          return this.createTreeNodeOfProperty(
            schema.properties[key],
            schema,
            absolutePath.concat(key),
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

        return this.createTreeNodeOfProperty(
          childSchema,
          schema,
          absolutePath.concat(key),
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
        return this.createTreeNodeOfProperty(
          schema.items,
          schema,
          absolutePath.concat(index),
          relativePath.concat(index),
          depth + 1
        );
      });
    }
    return children.concat(
      this.createAddItemTreeNode(absolutePath, relativePath, schema, depth + 1, children)
    );
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
      loaded: true,
    };
  }
  private createOneOfChildrenTreeNodes(
    absolutePath: Path,
    relativePath: Path,
    schema: JsonSchema,
    depth: number
  ) {
    const path = pathToString(absolutePath);
    const selectionOption = useSessionStore().currentSelectedOneOfAnyOfOptions.get(path);

    if (selectionOption !== undefined) {
      const subSchema = schema.oneOf[selectionOption.index];
      return [this.createTreeNodeOfProperty(subSchema, schema, absolutePath, relativePath, depth)];
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
    const selectionOption = useSessionStore().currentSelectedOneOfAnyOfOptions.get(path);

    if (selectionOption !== undefined) {
      const subSchema = schema.anyOf[selectionOption.index];
      return [this.createTreeNodeOfProperty(subSchema, schema, absolutePath, relativePath, depth)];
    }
    return [];
  }
}
