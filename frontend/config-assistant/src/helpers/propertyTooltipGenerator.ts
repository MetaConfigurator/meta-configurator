import type {ConfigTreeNodeData} from '@/model/ConfigDataTreeNode';
import {describeSchema} from '@/helpers/schema/schemaDescriptor';

export function generateTooltipText(nodeData: ConfigTreeNodeData) {
  return `<div>
      ${describeSchema(nodeData.schema, '' + nodeData.name, nodeData.parentSchema, true)}</div>`;
}
