<script setup lang="ts">
import {ref, watch} from 'vue';
import InputText from 'primevue/inputtext';
import type {PathElement} from '@/model/path';
import {generatePlaceholderText} from '@/helpers/propertyPlaceholderGenerator';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: string | undefined;
  propertySchema: JsonSchema;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', newValue: string | undefined): void;
}>();

const valueProperty = ref<string | undefined>(props.propertyData);

watch(
  props,
  () => {
    valueProperty.value = props.propertyData;
  },
  {immediate: true, deep: true}
);

function updateValue() {
  if (valueProperty.value === undefined) {
    return;
  }
  emit('update_property_value', valueProperty.value);
}
</script>

<template>
  <InputText
    :class="$style.tableInput"
    class="h-8"
    v-model="valueProperty"
    :placeholder="generatePlaceholderText(props.propertySchema, props.propertyName)"
    @blur="updateValue"
    @keyup.enter="updateValue" />
</template>

<style module>
/* remove border so it fits the look of the table better */
.tableInput {
  border: none;
}
</style>
