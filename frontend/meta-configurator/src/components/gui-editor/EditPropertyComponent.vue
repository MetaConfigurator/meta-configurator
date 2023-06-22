<script setup lang="ts">
import type {VNode} from 'vue';
import {h} from 'vue';
import BooleanProperty from '@/components/gui-editor/properties/BooleanProperty.vue';
import StringProperty from '@/components/gui-editor/properties/StringProperty.vue';
import type {SchemaTreeNodeData} from '@/schema/SchemaTreeNodeResolver';
import NumberProperty from '@/components/gui-editor/properties/NumberProperty.vue';
import IntegerProperty from '@/components/gui-editor/properties/IntegerProperty.vue';
import SimpleObjectProperty from '@/components/gui-editor/properties/SimpleObjectProperty.vue';
import SimpleArrayProperty from '@/components/gui-editor/properties/SimpleArrayProperty.vue';

const props = defineProps<{
  metadata: SchemaTreeNodeData;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', path: Array<string | number>, newValue: string): void;
}>();

function resolveCorrespondingComponent(): VNode {
  const propsObject = {
    propertyName: props.metadata.name,
    propertyData: props.metadata.data,
    propertySchema: props.metadata.schema,
  };
  if (props.metadata.schema.hasType('boolean')) {
    return h(BooleanProperty, propsObject);
  } else if (props.metadata.schema.hasType('string')) {
    return h(StringProperty, propsObject);
  } else if (props.metadata.schema.hasType('number')) {
    return h(NumberProperty, propsObject);
  } else if (props.metadata.schema.hasType('integer')) {
    return h(IntegerProperty, propsObject);
  } else if (props.metadata.schema.hasType('object')) {
    return h(SimpleObjectProperty, propsObject);
  } else if (props.metadata.schema.hasType('array')) {
    return h(SimpleArrayProperty, propsObject);
  }

  return h(
    'p',
    `Property ${props.metadata.name} with type ${props.metadata.schema.type} is not supported`
  );
}

function propagateUpdateEvent(newValue: any) {
  emit('update_property_value', props.metadata.relativePath, newValue);
}
</script>

<template>
  <Component
    class="truncate"
    :is="resolveCorrespondingComponent()"
    @update_property_value="(newValue: any) => propagateUpdateEvent(newValue)" />
</template>

<style scoped></style>
