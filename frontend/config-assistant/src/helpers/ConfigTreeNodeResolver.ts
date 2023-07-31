import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {ConfigDataTreeNodeType, GuiEditorTreeNode} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path, PathElement} from '@/model/path';
import {useSettingsStore} from '@/store/settingsStore';
import {pathToString} from '@/helpers/pathHelper';
import {PropertySorting} from '@/settings/settingsTypes';
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
    absolutePath: Array<PathElement> = [],
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
      leaf: this.isLeaf(schema, depth),
    };
  }

  private isLeaf(schema: JsonSchema, depth: number): boolean {
    return (
      (!schema.hasType('object') && !schema.hasType('array')) ||
      depth >= useSettingsStore().settingsData.guiEditor.maximumDepth
    );
  }

  public createChildNodesOfNode(guiEditorTreeNode: GuiEditorTreeNode): GuiEditorTreeNode[] {
    guiEditorTreeNode.children = this.createChildNodes(
      guiEditorTreeNode.data.schema,
      guiEditorTreeNode.data.absolutePath,
      guiEditorTreeNode.data.relativePath,
      guiEditorTreeNode.data.depth
    );
    return guiEditorTreeNode.children as GuiEditorTreeNode[];
  }

  private createChildNodes(
    schema: JsonSchema,
    absolutePath: Array<PathElement>,
    relativePath: Path = [],
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

    return children;
  }

  /**
   * Creates children nodes for an object node, sorted according to the order defined
   * in the settings.
   */
  private createObjectChildrenTreeNodes(
    parentPath: Array<PathElement>,
    path: Array<PathElement>,
    schema: JsonSchema,
    depth: number
  ) {
    const propertySorting = useSettingsStore().settingsData.guiEditor.propertySorting;

    if (propertySorting === PropertySorting.SCHEMA_ORDER) {
      return this.createObjectChildrenNodesAccordingToSchemaOrder(schema, parentPath, path, depth);
    }
    if (propertySorting === PropertySorting.DATA_ORDER) {
      return this.createObjectChildrenNodesAccordingToDataOrder(path, schema, parentPath, depth);
    }
    // priority sorting
    return this.createObjectChildrenNodesPriorityOrder(schema, parentPath, path, depth);
  }

  private createObjectChildrenNodesPriorityOrder(
    schema: JsonSchema,
    parentPath: Array<PathElement>,
    path: Array<PathElement>,
    depth: number
  ) {
    const requiredProperties = this.createPropertiesChildNodes(
      schema,
      parentPath,
      path,
      depth,
      key => schema.isRequired(key)
    );
    const optionalProperties = this.createPropertiesChildNodes(
      schema,
      parentPath,
      path,
      depth,
      key => !schema.isRequired(key) && !schema.properties[key].deprecated
    );
    const additionalProperties = this.createDataPropertiesChildNodes(
      parentPath,
      path,
      schema,
      depth,
      key => !schema.properties || !schema.properties[key]
    ); // filter out properties that are already in the schema
    const deprecatedProperties = this.createPropertiesChildNodes(
      schema,
      parentPath,
      path,
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
    path: Array<PathElement>,
    schema: JsonSchema,
    parentPath: Array<PathElement>,
    depth: number
  ) {
    const dataProperties = this.createDataPropertiesChildNodes(parentPath, path, schema, depth);
    const schemaProperties = this.createPropertiesChildNodes(
      schema,
      parentPath,
      path,
      depth,
      // filter out properties that are already in the data
      key => !dataProperties.find(node => node.data.name === key)
    );

    return dataProperties.concat(schemaProperties);
  }

  private createObjectChildrenNodesAccordingToSchemaOrder(
    schema: JsonSchema,
    parentPath: Array<PathElement>,
    path: Array<PathElement>,
    depth: number
  ) {
    const schemaProperties = this.createPropertiesChildNodes(schema, parentPath, path, depth);
    const dataProperties = this.createDataPropertiesChildNodes(
      parentPath,
      path,
      schema,
      depth,
      key => !schema.properties || !schema.properties[key]
    );
    return schemaProperties.concat(dataProperties);
  }

  private createPropertiesChildNodes(
    schema: JsonSchema,
    parentPath: Array<PathElement>,
    path: Array<PathElement>,
    depth: number,
    filter: (key: string) => boolean = () => true
  ) {
    return Object.entries(schema.properties)
      .filter(([key]) => filter(key))
      .map(([key, value]) =>
        this.createTreeNodeOfProperty(
          value,
          schema,
          parentPath.concat(key),
          path.concat(key),
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
}
