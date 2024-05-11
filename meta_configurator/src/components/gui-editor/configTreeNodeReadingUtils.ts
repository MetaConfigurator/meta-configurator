import type {
  ConfigDataTreeNodeType,
  ConfigTreeNodeData,
} from '@/components/gui-editor/configDataTreeNode';
import type {GuiEditorTreeNode} from '@/components/gui-editor/configDataTreeNode';
import type {PathElement} from '@/utility/path';
import {TreeNodeType} from '@/components/gui-editor/configDataTreeNode';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';

export function isRequiredProperty(nodeData: ConfigTreeNodeData): boolean {
  return nodeData.parentSchema?.isRequired(nodeData.name as string) || false;
}

export function getDisplayNameOfNode(node: GuiEditorTreeNode): string {
  const name: PathElement = node.data.name;
  if (name === '') {
    return node.data.parentSchema?.title || 'root'; // no name should only happen for the root node
  }
  if (typeof name === 'string') {
    return name;
  }
  // array index
  return (node.data.parentName || node.data.parentSchema?.title || 'element') + '[' + name + ']';
}

export function isAdditionalProperty(nodeType: ConfigDataTreeNodeType): boolean {
  return nodeType === TreeNodeType.ADDITIONAL_PROPERTY;
}

export function isPatternProperty(nodeType: ConfigDataTreeNodeType): boolean {
  return nodeType === TreeNodeType.PATTERN_PROPERTY;
}

export function isPropertyNameEditable(nodeType: ConfigDataTreeNodeType): boolean {
  return isAdditionalProperty(nodeType) || isPatternProperty(nodeType);
}

export function isUseItalicFont(nodeType: ConfigDataTreeNodeType): boolean {
  return isAdditionalProperty(nodeType) || isPatternProperty(nodeType);
}

export function isDeprecated(schema: JsonSchemaWrapper): boolean {
  return schema.deprecated;
}

// TODO: Also check if any parent element is read-only
export function isReadOnly(schema: JsonSchemaWrapper): boolean {
  return schema.readOnly;
}
