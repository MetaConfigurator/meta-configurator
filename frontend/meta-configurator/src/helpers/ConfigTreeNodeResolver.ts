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
      },
      type: TreeNodeType.DATA,
      key: depth + name.toString(),
      children: this.createChildNodes(name, schema, subPath, depth),
    };
  }

  private createChildNodes(
    name: PathElement,
    schema: JsonSchema,
    subPath: Path = [],
    depth = 0
  ): GuiEditorTreeNode[] {
    const depthLimit = useSettingsStore().settingsData.guiEditor.maximumDepth;
    const path = depth == 0 ? subPath : subPath.concat(name); // don't add root name to path

    let children: GuiEditorTreeNode[] = [];
    if (schema.hasType('object') && depth < depthLimit) {
      children = this.createObjectChildrenTreeNodes(path, schema, depth);
    }
    if (schema.hasType('array') && depth < depthLimit) {
      children = this.createArrayChildrenTreeNodes(name, path, schema, depth);
    }

    return children;
  }

  private createObjectChildrenTreeNodes(
    path: Array<PathElement>,
    schema: JsonSchema,
    depth: number
  ) {
    return Object.entries(schema.properties).map(([key, value]) =>
      this.createTreeNodeOfProperty(key, value, schema, path, depth + 1)
    );
  }

  private createArrayChildrenTreeNodes(
    name: string | number,
    path: Array<PathElement>,
    schema: JsonSchema,
    depth: number
  ) {
    const data = this.dataForProperty(path);
    let children: GuiEditorTreeNode[] = [];
    if (Array.isArray(data)) {
      children = data.map((value: any, index: number) => {
        return this.createTreeNodeOfProperty(index, schema.items, schema, path, depth + 1);
      });
    }
    return children.concat(this.createAddItemTreeNode(name, path, schema, depth + 1, children));
  }

  private createAddItemTreeNode(
    name: string | number,
    path: Array<PathElement>,
    schema: JsonSchema,
    depth: number,
    children: GuiEditorTreeNode[]
  ): GuiEditorTreeNode {
    return {
      data: {
        schema: schema.items,
        depth: depth,
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
