import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {GuiEditorTreeNode} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path, PathElement} from '@/model/path';
import {useSettingsStore} from '@/store/settingsStore';
import {pathToString} from '@/helpers/pathHelper';

export class ConfigTreeNodeResolver {
  private readonly configDataSupplier: () => any;

  constructor(configDataSupplier: () => any) {
    this.configDataSupplier = configDataSupplier;
  }

  public createTreeNodeOfProperty(
    name: PathElement,
    schema: JsonSchema,
    parentSchema?: JsonSchema,
    parentPath: Array<PathElement> = [],
    subPath: Path = [],
    depth: number = 0
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
      type: TreeNodeType.DATA,
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

  private createObjectChildrenTreeNodes(
    parentPath: Array<PathElement>,
    path: Array<PathElement>,
    schema: JsonSchema,
    depth: number
  ) {
    return Object.entries(schema.properties).map(([key, value]) =>
      this.createTreeNodeOfProperty(key, value, schema, parentPath, path, depth + 1)
    );
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
    let currentData: any = this.configDataSupplier();

    for (const key of name) {
      if (currentData[key] === undefined) {
        return undefined;
      }
      currentData = currentData[key];
    }

    return currentData;
  }
}
