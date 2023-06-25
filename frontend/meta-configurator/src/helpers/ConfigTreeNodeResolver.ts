import {JsonSchema} from '@/model/JsonSchema';
import type {ConfigTreeNode} from '@/model/ConfigTreeNode';

export class ConfigTreeNodeResolver {
  private readonly depthLimit: number;
  private readonly configDataSupplier: () => any;

  constructor(configDataSupplier: () => any, depthLimit: number) {
    this.configDataSupplier = configDataSupplier;
    this.depthLimit = depthLimit;
  }

  public createTreeNodeOfProperty(
    name: string | number,
    schema: JsonSchema,
    parentSchema: JsonSchema,
    depth = 0,
    subPath: Array<string | number> = []
  ): ConfigTreeNode {
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
        relativePath: path,
      },
      key: depth + name.toString(),
      children: this.createChildNodes(name, schema, depth, subPath),
    };
  }

  private createChildNodes(
    name: string | number,
    schema: JsonSchema,
    depth = 0,
    subPath: Array<string | number> = []
  ): ConfigTreeNode[] {
    let children: ConfigTreeNode[] = [];
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
    }
    return children;
  }

  private dataForProperty(name: Array<string | number>): any {
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
