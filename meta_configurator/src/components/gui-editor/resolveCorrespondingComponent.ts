import EnumProperty from '@/components/gui-editor/properties/EnumProperty.vue';
import BooleanProperty from '@/components/gui-editor/properties/BooleanProperty.vue';
import StringProperty from '@/components/gui-editor/properties/StringProperty.vue';
import NumberProperty from '@/components/gui-editor/properties/NumberProperty.vue';
import SimpleObjectProperty from '@/components/gui-editor/properties/SimpleObjectProperty.vue';
import SimpleArrayProperty from '@/components/gui-editor/properties/SimpleArrayProperty.vue';
import type {AddItemTreeNodeData, ConfigTreeNodeData} from '@/model/configDataTreeNode';
import type {VNode} from 'vue';
import {h} from 'vue';
import {useSessionStore} from '@/store/sessionStore';
import OneOfAnyOfSelectionProperty from '@/components/gui-editor/properties/OneOfSelectionProperty.vue';
import AnyOfSelectionProperty from '@/components/gui-editor/properties/AnyOfSelectionProperty.vue';
import {useCurrentDataLink} from '@/data/useDataLink';
import {useValidationResult} from '@/schema/validation/useValidation';

/**
 * Resolves the corresponding component for a given node.
 * The component is determined by the schema of the node.
 */
export function resolveCorrespondingComponent(
  nodeData: ConfigTreeNodeData | AddItemTreeNodeData
): VNode {
  const propsObject = {
    propertyName: nodeData.name,
    propertyData: useCurrentDataLink().dataAt(nodeData.absolutePath),
    propertySchema: nodeData.schema,
    parentSchema: nodeData.parentSchema,
    relativePath: nodeData.relativePath,
    absolutePath: nodeData.absolutePath,
    validationResults: useValidationResult().filterForPath(nodeData.absolutePath),
    expanded: useSessionStore().isExpanded(nodeData.absolutePath),
  };

  if (nodeData.schema.oneOf.length > 0) {
    // @ts-ignore
    return h(OneOfAnyOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: nodeData.schema.oneOf,
    });
  }
  if (nodeData.schema.anyOf.length > 0) {
    // @ts-ignore
    return h(AnyOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: nodeData.schema.anyOf,
    });
  }

  if (nodeData.schema.enum !== undefined) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: nodeData.schema.enum,
    });
  }

  if (nodeData.schema.hasType('string') && hasTwoOrMoreExamples(nodeData.schema)) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: nodeData.schema.examples,
    });
  }

  if (nodeData.schema.hasType('string')) {
    // @ts-ignore
    return h(StringProperty, propsObject);
  }

  if (nodeData.schema.hasType('boolean')) {
    // @ts-ignore
    return h(BooleanProperty, propsObject);
  }

  if (nodeData.schema.hasType('number') || nodeData.schema.hasType('integer')) {
    // @ts-ignore
    return h(NumberProperty, propsObject);
  }

  if (nodeData.schema.hasType('object')) {
    // @ts-ignore
    return h(SimpleObjectProperty, propsObject);
  }

  if (nodeData.schema.hasType('array')) {
    // @ts-ignore
    return h(SimpleArrayProperty, propsObject);
  }

  if (nodeData.schema.hasType('null')) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: [null],
    });
  }

  return h('p', `Property ${nodeData.name} with type ${nodeData.schema.type} is not supported`);
}

function hasTwoOrMoreExamples(schema: any): boolean {
  return schema.examples !== undefined && schema.examples.length > 1;
}
