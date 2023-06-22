import type {TreeNode} from 'primevue/tree';
import {JsonSchema} from '@/schema/JsonSchema';

/**
 * Represents a node in the schema tree.
 * Compatible with the PrimeVue TreeNode interface.
 */
export interface SchemaTreeNode extends TreeNode {
  data: SchemaTreeNodeData;
}

export interface SchemaTreeNodeData {
  name: string | number;
  schema: JsonSchema;
  parentSchema?: JsonSchema;
  data: any;
  relativePath: (string | number)[];
}

export class SchemaTreeNodeResolver {
  private readonly depthLimit: number;
  private readonly configDataSupplier: () => any;

  constructor(configDataSupplier: () => any, depthLimit = 3) {
    this.configDataSupplier = configDataSupplier;
    this.depthLimit = depthLimit;
  }

  public createTreeNodeOfProperty(
    name: string | number,
    schema: JsonSchema,
    parentSchema: JsonSchema,
    depth = 0,
    subPath: Array<string | number> = []
  ): SchemaTreeNode {
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
  ): SchemaTreeNode[] {
    let children: SchemaTreeNode[] = [];
    const path = subPath.concat(name);
    if (schema.hasType('object') && depth < this.depthLimit) {
      children = children.concat(
        Object.entries(schema.properties).map(([key, value]) =>
          this.createTreeNodeOfProperty(key, value, schema, depth + 1, subPath.concat(name))
        )
      );
    }
    if (schema.hasType('array')
      && depth < this.depthLimit
      && Array.isArray(this.dataForProperty(path))) {
      children = this.dataForProperty(path).map((value: any, index: number) => {
        return this.createTreeNodeOfProperty(
          index,
          schema.items,
          schema,
          depth + 1,
          path
        );
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
