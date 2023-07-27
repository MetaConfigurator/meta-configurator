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
   * @param name The name of the node. Use the schema's title for the root node.
   * @param schema The schema of the node.
   * @param parentSchema The schema of the parent node.
   * @param parentPath The path of the parent node.
   * @param subPath The path of the node relative to the parent node. Defaults to the empty path.
   * @param depth The depth of the node in the tree, starting with 0 for the root node.
   * @param nodeType The type of the node, e.g. {@link TreeNodeType.SCHEMA_PROPERTY} by default.
   */
  public createTreeNodeOfProperty(
    name: PathElement,
    schema: JsonSchema,
    parentSchema?: JsonSchema,
    parentPath: Array<PathElement> = [],
    subPath: Path = [],
    depth: number = 0,
    nodeType: ConfigDataTreeNodeType = TreeNodeType.SCHEMA_PROPERTY
  ): GuiEditorTreeNode {
    if (!schema) {
      throw new Error(`Schema for property ${name} is undefined`);
    }

    const path = subPath.concat(name);
    return {
      data: {
        name: name,
        schema: schema,
        parentSchema: parentSchema,
        data: this.dataForProperty(path),
        depth: depth,
        relativePath: path,
        absolutePath: parentPath.concat(path),
      },
      type: nodeType,
      key: pathToString(parentPath.concat(path)),
      children: this.createChildNodes(name, schema, parentPath, subPath, depth),
    };
  }

  private createChildNodes(
    name: PathElement,
    schema: JsonSchema,
    parentPath: Array<PathElement>,
    subPath: Path = [],
    depth = 0
  ): GuiEditorTreeNode[] {
    const depthLimit = useSettingsStore().settingsData.guiEditor.maximumDepth;
    const path = depth == 0 ? subPath : subPath.concat(name); // don't add root name to path

    let children: GuiEditorTreeNode[] = [];
    if (schema.hasType('object') && depth < depthLimit) {
      children = this.createObjectChildrenTreeNodes(parentPath, path, schema, depth);
    }
    if (schema.hasType('array') && depth < depthLimit) {
      children = this.createArrayChildrenTreeNodes(parentPath, path, schema, depth);
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
    // default sorting
    return this.createObjectChildrenNodesDefaultOrder(schema, parentPath, path, depth);
  }

  private createObjectChildrenNodesDefaultOrder(
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
      path,
      schema,
      parentPath,
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
    const dataProperties = this.createDataPropertiesChildNodes(path, schema, parentPath, depth);
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
      path,
      schema,
      parentPath,
      depth,
      // filter out properties that are already in the schema
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
        this.createTreeNodeOfProperty(key, value, schema, parentPath, path, depth + 1)
      );
  }

  private createDataPropertiesChildNodes(
    path: Array<PathElement>,
    schema: JsonSchema,
    parentPath: Array<PathElement>,
    depth: number,
    filter: (key: string) => boolean = () => true
  ) {
    const data = this.dataForProperty(path);
    if (!data) {
      return [];
    }

    return Object.entries(data)
      .filter(([key]) => filter(key))
      .map(([key]) => {
        if (schema.properties && schema.properties[key]) {
          return this.createTreeNodeOfProperty(
            key,
            schema.properties[key],
            schema,
            parentPath,
            path,
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
          key,
          childSchema,
          schema,
          parentPath,
          path,
          depth + 1,
          type
        );
      });
  }

  private createArrayChildrenTreeNodes(
    parentPath: Array<PathElement>,
    path: Array<PathElement>,
    schema: JsonSchema,
    depth: number
  ) {
    const data = this.dataForProperty(path);
    let children: GuiEditorTreeNode[] = [];
    if (Array.isArray(data)) {
      children = data.map((value: any, index: number) => {
        return this.createTreeNodeOfProperty(
          index,
          schema.items,
          schema,
          parentPath,
          path,
          depth + 1
        );
      });
    }
    return children.concat(
      this.createAddItemTreeNode(parentPath, path, schema, depth + 1, children)
    );
  }

  private createAddItemTreeNode(
    parentPath: Path,
    path: Path,
    schema: JsonSchema,
    depth: number,
    children: GuiEditorTreeNode[]
  ): GuiEditorTreeNode {
    const pathWithIndex = path.concat(children.length);
    return {
      data: {
        schema: schema.items,
        depth: depth,
        relativePath: pathWithIndex,
        absolutePath: parentPath.concat(pathWithIndex),
        name: children.length,
        data: undefined,
      },
      type: TreeNodeType.ADD_ITEM,
      key: pathToString(parentPath.concat(pathWithIndex)),
      children: [],
    };
  }

  private dataForProperty(name: Path): any {
    let currentData: any = useSessionStore().dataAtCurrentPath;

    for (const key of name) {
      if (currentData[key] === undefined) {
        return undefined;
      }
      currentData = currentData[key];
    }

    return currentData;
  }
}
