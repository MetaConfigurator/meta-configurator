import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {GuiEditorTreeNode} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path, PathElement} from '@/model/path';

export class ConfigTreeNodeResolver {
  private readonly depthLimit: number;
  private readonly configDataSupplier: () => any;

  constructor(configDataSupplier: () => any, depthLimit: number) {
    this.configDataSupplier = configDataSupplier;
    this.depthLimit = depthLimit;
  }

  public createTreeNodeOfProperty(
    name: PathElement,
    schema: JsonSchema,
    parentSchema: JsonSchema,
    depth = 0,
    subPath: Path = []
  ): GuiEditorTreeNode {
    if (!schema) {
      throw new Error(`Schema for property ${name} is undefined`);
    }
    if (!parentSchema) {
      throw new Error(`Parent schema for property ${name} is undefined`);
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
    let children: GuiEditorTreeNode[] = [];
    const path = subPath.concat(name);
    if (schema.hasType('object') && depth < this.depthLimit) {
      children = children.concat(
        Object.entries(schema.properties).map(([key, value]) =>
          this.createTreeNodeOfProperty(key, value, schema, depth + 1, subPath.concat(name))
        )
      );
    }
    if (
      schema.hasType('array') &&
      depth < this.depthLimit &&
      Array.isArray(this.dataForProperty(path))
    ) {
      children = this.dataForProperty(path).map((value: any, index: number) => {
        return this.createTreeNodeOfProperty(index, schema.items, schema, depth + 1, path);
      });
      children = children.concat({
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
      });
    }
    return children;
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
