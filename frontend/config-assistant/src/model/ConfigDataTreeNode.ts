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

export interface AddPropertyTreeNode extends TreeNode {
  data: AddPropertyTreeData;
  type: TreeNodeType.ADD_PROPERTY;
}

export type GuiEditorTreeNode = ConfigDataTreeNode | AddItemTreeNode | AddPropertyTreeNode;

export type ConfigDataTreeNodeType =
  | TreeNodeType.SCHEMA_PROPERTY
  | TreeNodeType.ADDITIONAL_PROPERTY
  | TreeNodeType.PATTERN_PROPERTY;
export enum TreeNodeType {
  SCHEMA_PROPERTY = 'data',
  ADDITIONAL_PROPERTY = 'additionalProperty',
  PATTERN_PROPERTY = 'patternProperty',
  ADD_ITEM = 'addItem',
  ADD_PROPERTY = 'addProperty',
}

export interface AddItemTreeNodeData {
  schema: JsonSchema; // schema of the items
  parentSchema?: JsonSchema;
  parentName?: PathElement;
  depth: number;
  relativePath: Path;
  absolutePath: Path;
  name: PathElement;
}

export interface ConfigTreeNodeData {
  name: PathElement;
  schema: JsonSchema;
  parentSchema?: JsonSchema;
  parentName?: PathElement;
  relativePath: Path;
  absolutePath: Path;
  depth: number;
}

export interface AddPropertyTreeData {
  name: PathElement;
  schema: JsonSchema;
  parentSchema: JsonSchema;
  parentName?: PathElement;
  relativePath: Path;
  absolutePath: Path;
  depth: number;
}
