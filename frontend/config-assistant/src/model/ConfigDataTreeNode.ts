import type {TreeNode} from 'primevue/tree';
import type {Path, PathElement} from '@/model/path';
import {JsonSchema} from '@/helpers/schema/JsonSchema';

/**
 * Represents a node in the schema tree.
 * Compatible with the PrimeVue TreeNode interface.
 */
export interface ConfigDataTreeNode extends TreeNode {
  data: ConfigTreeNodeData;
  type: ConfigDataTreeNodeType;
}

export interface AddItemTreeNode extends TreeNode {
  data: AddItemTreeNodeData;
  type: TreeNodeType.ADD_ITEM;
}

export type GuiEditorTreeNode = ConfigDataTreeNode | AddItemTreeNode;

export type ConfigDataTreeNodeType =
  | TreeNodeType.SCHEMA_PROPERTY
  | TreeNodeType.ADDITIONAL_PROPERTY
  | TreeNodeType.PATTERN_PROPERTY;
export enum TreeNodeType {
  SCHEMA_PROPERTY = 'data',
  ADDITIONAL_PROPERTY = 'additionalProperty',
  PATTERN_PROPERTY = 'patternProperty',
  ADD_ITEM = 'addItem',
}

export interface AddItemTreeNodeData {
  schema: JsonSchema; // schema of the items
  depth: number;
  relativePath: Path;
  absolutePath: Path;
  name: PathElement;
  data?: any;
}

export interface ConfigTreeNodeData {
  name: PathElement;
  schema: JsonSchema;
  parentSchema?: JsonSchema;
  data: any;
  relativePath: Path;
  absolutePath: Path;
  depth: number;
}
