import type {TreeNode} from 'primevue/tree';
import {JsonSchema} from '@/schema/JsonSchema';

/**
 * Represents a node in the schema tree.
 * Compatible with the PrimeVue TreeNode interface.
 */
export interface SchemaTreeNode extends TreeNode {
  data: {
    name: string;
    schema: JsonSchema;
    parentSchema?: JsonSchema;
    data: any;
    relativePath: (string | number)[];
  };
}

export class SchemaTreeNodeResolver {
  private readonly depthLimit: number;
  private readonly configDataSupplier: () => any;

  constructor(configDataSupplier: () => any, depthLimit = 3) {
    this.configDataSupplier = configDataSupplier;
    this.depthLimit = depthLimit;
  }

  public createTreeNodeOfProperty(
    name: string,
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
      key: depth + name,
      children: this.createChildNodes(name, schema, parentSchema, depth, subPath),
    };
  }

  private createChildNodes(
    name: string,
    schema: JsonSchema,
    parentSchema: JsonSchema,
    depth = 0,
    subPath: Array<string | number> = []
  ): SchemaTreeNode[] {
    let children: SchemaTreeNode[] = [];
    const path = subPath.concat(name);
    if (this.isObject(name, parentSchema) && depth < this.depthLimit) {
      children = children.concat(
        Object.entries(schema.properties).map(([key, value]) =>
          this.createTreeNodeOfProperty(key, value, schema, depth + 1, subPath.concat(name))
        )
      );
    }
    if (this.isArray(name, parentSchema) && depth < this.depthLimit) {
      children = this.dataForProperty(path).map((value: any, index: number) => {
        return this.createTreeNodeOfProperty(
          index.toString(),
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
      if (!currentData[key]) {
        return undefined;
      }
      currentData = currentData[key];
    }

    return currentData;
  }

  private isObject(name: string | number, parentSchema: JsonSchema): boolean {
    return parentSchema.properties[name]?.hasType('object') ?? false;
  }

  private isArray(name: string | number, parentSchema: JsonSchema): boolean {
    return parentSchema.properties[name]?.hasType('array') ?? false;
  }
}
