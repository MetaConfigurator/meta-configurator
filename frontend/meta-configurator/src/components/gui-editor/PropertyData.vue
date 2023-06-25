<script setup lang="ts">
import type {VNode} from 'vue';
import {h} from 'vue';

import type {ConfigTreeNodeData} from '@/model/ConfigTreeNode';
import BooleanProperty from '@/components/gui-editor/properties/BooleanProperty.vue';
import StringProperty from '@/components/gui-editor/properties/StringProperty.vue';
import NumberProperty from '@/components/gui-editor/properties/NumberProperty.vue';
import IntegerProperty from '@/components/gui-editor/properties/IntegerProperty.vue';
import SimpleObjectProperty from '@/components/gui-editor/properties/SimpleObjectProperty.vue';
import SimpleArrayProperty from '@/components/gui-editor/properties/SimpleArrayProperty.vue';

const props = defineProps<{
  nodeData: ConfigTreeNodeData;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', path: Array<string | number>, newValue: string): void;
}>();

function resolveCorrespondingComponent(): VNode {
  const propsObject = {
    propertyName: props.nodeData.name,
    propertyData: props.nodeData.data,
    propertySchema: props.nodeData.schema,
  };
  if (props.nodeData.schema.hasType('boolean')) {
    return h(BooleanProperty, propsObject);
  } else if (props.nodeData.schema.hasType('string')) {
    return h(StringProperty, propsObject);
  } else if (props.nodeData.schema.hasType('number')) {
    return h(NumberProperty, propsObject);
  } else if (props.nodeData.schema.hasType('integer')) {
    return h(IntegerProperty, propsObject);
  } else if (props.nodeData.schema.hasType('object')) {
    return h(SimpleObjectProperty, propsObject);
  } else if (props.nodeData.schema.hasType('array')) {
    return h(SimpleArrayProperty, propsObject);
  }

  return h(
    'p',
    `Property ${props.nodeData.name} with type ${props.nodeData.schema.type} is not supported`
  );
}

function propagateUpdateEvent(newValue: any) {
  emit('update_property_value', props.nodeData.relativePath, newValue);
}
</script>

<template>
  <Component
    class="truncate"
    :is="resolveCorrespondingComponent()"
    @update_property_value="(newValue: any) => propagateUpdateEvent(newValue)" />
</template>

<style scoped></style>
