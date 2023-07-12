import EnumProperty from '@/components/gui-editor/properties/EnumProperty.vue';
import BooleanProperty from '@/components/gui-editor/properties/BooleanProperty.vue';
import StringProperty from '@/components/gui-editor/properties/StringProperty.vue';
import NumberProperty from '@/components/gui-editor/properties/NumberProperty.vue';
import IntegerProperty from '@/components/gui-editor/properties/IntegerProperty.vue';
import SimpleObjectProperty from '@/components/gui-editor/properties/SimpleObjectProperty.vue';
import SimpleArrayProperty from '@/components/gui-editor/properties/SimpleArrayProperty.vue';
import type {AddItemTreeNodeData, ConfigTreeNodeData} from '@/model/ConfigDataTreeNode';
import type {VNode} from 'vue';
import {h} from 'vue';

export function resolveCorrespondingComponent(nodeData: ConfigTreeNodeData | AddItemTreeNodeData): VNode {
  const propsObject = {
    propertyName: nodeData.name,
    propertyData: nodeData.data,
    propertySchema: nodeData.schema,
  };
  if (nodeData.schema.enum !== undefined) {
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: nodeData.schema.enum,
    });
  } else if (nodeData.schema.hasType('boolean')) {
    return h(BooleanProperty, propsObject);
  } else if (nodeData.schema.hasType('string')) {
    return h(StringProperty, propsObject);
  } else if (nodeData.schema.hasType('number')) {
    return h(NumberProperty, propsObject);
  } else if (nodeData.schema.hasType('integer')) {
    return h(IntegerProperty, propsObject);
  } else if (nodeData.schema.hasType('object')) {
    return h(SimpleObjectProperty, propsObject);
  } else if (nodeData.schema.hasType('array')) {
    return h(SimpleArrayProperty, propsObject);
  }

  return h(
    'p',
    `Property ${nodeData.name} with type ${nodeData.schema.type} is not supported`,
  );
}
