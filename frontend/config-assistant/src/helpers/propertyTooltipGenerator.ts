import type {ConfigTreeNodeData} from '@/model/ConfigDataTreeNode';

export function generateTooltipText(nodeData: ConfigTreeNodeData) {
  const schema = nodeData.schema;
  let result = schema.description === undefined ? '' : '"' + schema.description + '"\n';

  if (nodeData.parentSchema?.isRequired(nodeData.name as string)) {
    result += '\nThis property is required.';
  }
  if (schema.deprecated) {
    result += '\nThis property is deprecated.';
  }

  const hasExample = schema.examples !== undefined && schema.examples.length > 0;
  if (hasExample) {
    result += '\nPossible Examples:' + schema.examples;
  }

  const hasMinOrMax =
    schema.exclusiveMinimum !== undefined ||
    schema.exclusiveMaximum !== undefined ||
    schema.minimum !== undefined ||
    schema.maximum !== undefined;
  if (hasMinOrMax) {
    result += '\nValue must be';
    let hadConstraintBefore = false;
    if (schema.exclusiveMinimum !== undefined) {
      result += ' > ' + schema.exclusiveMinimum;
      hadConstraintBefore = true;
    }
    if (schema.minimum !== undefined) {
      if (hadConstraintBefore) {
        result += ' and';
      }
      result += ' >= ' + schema.minimum;
      hadConstraintBefore = true;
    }
    if (schema.exclusiveMaximum !== undefined) {
      if (hadConstraintBefore) {
        result += ' and';
      }
      result += ' < ' + schema.exclusiveMaximum;
      hadConstraintBefore = true;
    }
    if (schema.maximum !== undefined) {
      if (hadConstraintBefore) {
        result += ' and';
      }
      result += ' <= ' + schema.maximum;
    }
  }
  return result;
}
