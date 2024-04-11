import type {TreeNode} from 'primevue/tree';
import type {Path, PathElement} from '@/model/path';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';

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
  | TreeNodeType.PATTERN_PROPERTY
  | TreeNodeType.ADVANCED_PROPERTY;

export enum TreeNodeType {
  SCHEMA_PROPERTY = 'data',
  ADDITIONAL_PROPERTY = 'additionalProperty',
  PATTERN_PROPERTY = 'patternProperty',
  ADD_ITEM = 'addItem',
  ADD_PROPERTY = 'addProperty',
  ADVANCED_PROPERTY = 'advancedProperty',
}

export interface AddItemTreeNodeData {
  schema: JsonSchemaWrapper; // schema of the items
  parentSchema?: JsonSchemaWrapper;
  parentName?: PathElement;
  depth: number;
  relativePath: Path;
  absolutePath: Path;
  name: PathElement;
}

export interface ConfigTreeNodeData {
  name: PathElement;
  schema: JsonSchemaWrapper;
  parentSchema?: JsonSchemaWrapper;
  parentName?: PathElement;
  relativePath: Path;
  absolutePath: Path;
  depth: number;
}

export interface AddPropertyTreeData {
  name: PathElement;
  schema: JsonSchemaWrapper;
  parentSchema: JsonSchemaWrapper;
  parentName?: PathElement;
  relativePath: Path;
  absolutePath: Path;
  depth: number;
}
