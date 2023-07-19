import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {GuiEditorTreeNode} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path, PathElement} from '@/model/path';
import {useSettingsStore} from '@/store/settingsStore';

export class ConfigTreeNodeResolver {
  private readonly configDataSupplier: () => any;

  constructor(configDataSupplier: () => any) {
    this.configDataSupplier = configDataSupplier;
  }

  public createTreeNodeOfProperty(
    name: PathElement,
    schema: JsonSchema,
    parentSchema?: JsonSchema,
    depth: number = 0,
    subPath: Path = []
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
      },
      type: TreeNodeType.DATA,
      key: depth + name.toString(),
      children: this.createChildNodes(name, schema, depth, subPath),
    };
  }

  private createChildNodes(
    name: PathElement,
    schema: JsonSchema,
    depth = 0,
    subPath: Path = []
  ): GuiEditorTreeNode[] {
    const depthLimit = useSettingsStore().settingsData.guiEditor.maximumDepth;
    const path = depth == 0 ? subPath : subPath.concat(name); // don't add root name to path

    let children: GuiEditorTreeNode[] = [];
    if (schema.hasType('object') && depth < depthLimit) {
      children = this.createObjectChildrenTreeNodes(schema, depth, path);
    }
    if (schema.hasType('array') && depth < depthLimit) {
      children = this.createArrayChildrenTreeNodes(path, children, schema, depth, name);
    }

    return children;
  }

  private createObjectChildrenTreeNodes(
    schema: JsonSchema,
    depth: number,
    path: Array<PathElement>
  ) {
    return Object.entries(schema.properties).map(([key, value]) =>
      this.createTreeNodeOfProperty(key, value, schema, depth + 1, path)
    );
  }

  private createArrayChildrenTreeNodes(
    path: Array<PathElement>,
    children: GuiEditorTreeNode[],
    schema: JsonSchema,
    depth: number,
    name: string | number
  ) {
    const data = this.dataForProperty(path);
    if (Array.isArray(data)) {
      children = data.map((value: any, index: number) => {
        return this.createTreeNodeOfProperty(index, schema.items, schema, depth + 1, path);
      });
    }
    return children.concat(this.createAddItemTreeNode(children, schema, depth, path, name));
  }

  private createAddItemTreeNode(
    children: GuiEditorTreeNode[],
    schema: JsonSchema,
    depth: number,
    path: Array<PathElement>,
    name: string | number
  ): GuiEditorTreeNode {
    return {
      data: {
        schema: schema.items,
        depth: depth + 1,
        relativePath: path.concat(children.length),
        name: children.length,
        data: undefined,
      },
      type: TreeNodeType.ADD_ITEM,
      key: depth + name.toString(),
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
