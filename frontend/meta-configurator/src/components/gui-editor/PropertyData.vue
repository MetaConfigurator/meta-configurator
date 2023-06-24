<script setup lang="ts">
import type {VNode} from 'vue';
import {h} from 'vue';

import type {SchemaTreeNodeData} from '@/schema/model/SchemaTreeNode';
import BooleanProperty from '@/components/gui-editor/properties/BooleanProperty.vue';
import StringProperty from '@/components/gui-editor/properties/StringProperty.vue';
import NumberProperty from '@/components/gui-editor/properties/NumberProperty.vue';
import IntegerProperty from '@/components/gui-editor/properties/IntegerProperty.vue';
import SimpleObjectProperty from '@/components/gui-editor/properties/SimpleObjectProperty.vue';
import SimpleArrayProperty from '@/components/gui-editor/properties/SimpleArrayProperty.vue';

const props = defineProps<{
  data: SchemaTreeNodeData;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', path: Array<string | number>, newValue: string): void;
}>();

function resolveCorrespondingComponent(): VNode {
  const propsObject = {
    propertyName: props.data.name,
    propertyData: props.data.data,
    propertySchema: props.data.schema,
  };
  if (props.data.schema.hasType('boolean')) {
    return h(BooleanProperty, propsObject);
  } else if (props.data.schema.hasType('string')) {
    return h(StringProperty, propsObject);
  } else if (props.data.schema.hasType('number')) {
    return h(NumberProperty, propsObject);
  } else if (props.data.schema.hasType('integer')) {
    return h(IntegerProperty, propsObject);
  } else if (props.data.schema.hasType('object')) {
    return h(SimpleObjectProperty, propsObject);
  } else if (props.data.schema.hasType('array')) {
    return h(SimpleArrayProperty, propsObject);
  }

  return h('p', `Property ${props.data.name} with type ${props.data.schema.type} is not supported`);
}

function propagateUpdateEvent(newValue: any) {
  emit('update_property_value', props.data.relativePath, newValue);
}
</script>

<template>
  <Component
    class="truncate"
    :is="resolveCorrespondingComponent()"
    @update_property_value="newValue => propagateUpdateEvent(newValue)" />
</template>

<style scoped></style>
