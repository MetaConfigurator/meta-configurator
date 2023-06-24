import type {TreeNode} from 'primevue/tree';
import {JsonSchema} from '@/model/JsonSchema';

/**
 * Represents a node in the schema tree.
 * Compatible with the PrimeVue TreeNode interface.
 */
export interface ConfigTreeNode extends TreeNode {
  data: ConfigTreeNodeData;
}

export interface ConfigTreeNodeData {
  name: string | number;
  schema: JsonSchema;
  parentSchema?: JsonSchema;
  data: any;
  relativePath: (string | number)[];
}
