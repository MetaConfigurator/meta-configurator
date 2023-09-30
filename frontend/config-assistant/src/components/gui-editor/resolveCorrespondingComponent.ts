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
import {useSessionStore} from '@/store/sessionStore';
import OneOfAnyOfSelectionProperty from '@/components/gui-editor/properties/OneOfAnyOfSelectionProperty.vue';
import AnyOfSelectionProperty from '@/components/gui-editor/properties/AnyOfSelectionProperty.vue';

export function resolveCorrespondingComponent(
  nodeData: ConfigTreeNodeData | AddItemTreeNodeData
): VNode {
  const propsObject = {
    propertyName: nodeData.name,
    propertyData: useSessionStore().dataAtPath(nodeData.absolutePath),
    propertySchema: nodeData.schema,
    parentSchema: nodeData.parentSchema,
    relativePath: nodeData.relativePath,
    absolutePath: nodeData.absolutePath,
    validationResults: useSessionStore().dataValidationResults.filterForPath(nodeData.absolutePath),
  };
  if (nodeData.schema.oneOf.length > 0) {
    // @ts-ignore
    return h(OneOfAnyOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: nodeData.schema.oneOf,
    });
  } else if (nodeData.schema.anyOf.length > 0) {
    // @ts-ignore
    return h(AnyOfSelectionProperty, {
      ...propsObject,
      possibleSchemas: nodeData.schema.anyOf,
    });
  } else if (nodeData.schema.enum !== undefined) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: nodeData.schema.enum,
    });
  } else if (nodeData.schema.hasType('string') && hasTwoOrMoreExamples(nodeData.schema)) {
    // @ts-ignore
    return h(EnumProperty, {
      ...propsObject,
      possibleValues: nodeData.schema.examples,
    });
  } else if (nodeData.schema.hasType('string')) {
    // @ts-ignore
    return h(StringProperty, propsObject);
  } else if (nodeData.schema.hasType('boolean')) {
    // @ts-ignore
    return h(BooleanProperty, propsObject);
  }

  if (nodeData.schema.hasType('number') || nodeData.schema.hasType('integer')) {
    // @ts-ignore
    return h(NumberProperty, propsObject);
  } else if (nodeData.schema.hasType('integer')) {
    // @ts-ignore
    return h(IntegerProperty, propsObject);
  } else if (nodeData.schema.hasType('object')) {
    // @ts-ignore
    return h(SimpleObjectProperty, propsObject);
  } else if (nodeData.schema.hasType('array')) {
    // @ts-ignore
    return h(SimpleArrayProperty, propsObject);
  }

  return h('p', `Property ${nodeData.name} with type ${nodeData.schema.type} is not supported`);
}

function hasTwoOrMoreExamples(schema: any): boolean {
  return schema.examples !== undefined && schema.examples.length > 1;
}
