import type {TreeNode} from 'primevue/tree';
import {JsonSchema} from '@/schema/model/JsonSchema';

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
