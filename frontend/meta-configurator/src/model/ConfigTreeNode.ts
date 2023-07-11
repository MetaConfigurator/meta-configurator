import type {TreeNode} from 'primevue/tree';
import {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {Path, PathElement} from '@/model/path';

/**
 * Represents a node in the schema tree.
 * Compatible with the PrimeVue TreeNode interface.
 */
export interface ConfigTreeNode extends TreeNode {
  data: ConfigTreeNodeData;
}

export interface ConfigTreeNodeData {
  name: PathElement;
  schema: JsonSchema;
  parentSchema?: JsonSchema;
  data: any;
  relativePath: Path;
  depth: number;
}
