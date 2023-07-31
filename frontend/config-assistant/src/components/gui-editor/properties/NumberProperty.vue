<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';
import {computed} from 'vue';
import type {PathElement} from '@/model/path';
import {JsonSchema} from '@/helpers/schema/JsonSchema';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: number | undefined;
  propertySchema: JsonSchema;
}>();

const placeHolderValue = computed(() => {
  return props.propertySchema.examples && props.propertySchema.examples.length > 0
    ? `Possible Examples: ${props.propertySchema.examples}`
    : '';
});

const stepValue = computed(() => {
  return props.propertySchema.multipleOf ?? 0.1;
});

const maxValue = computed(() => {
  if (props.propertySchema.exclusiveMaximum !== undefined) {
    return props.propertySchema.exclusiveMaximum - stepValue.value;
  } else if (props.propertySchema.maximum !== undefined) {
    return props.propertySchema.maximum;
  } else {
    return undefined;
  }
});

const minValue = computed(() => {
  if (props.propertySchema.exclusiveMinimum !== undefined) {
    return props.propertySchema.exclusiveMinimum + stepValue.value;
  } else if (props.propertySchema.minimum !== undefined) {
    return props.propertySchema.minimum;
  } else {
    return undefined;
  }
});

const emit = defineEmits<{
  (e: 'update_property_value', newValue: number | undefined): void;
}>();

const valueProperty = computed({
  get() {
    return props.propertyData;
  },
  set(newValue) {
    if (newValue !== null) {
      emit('update_property_value', newValue);
    }
  },
});
</script>

<template>
  <InputNumber
    class="h-8"
    v-model="valueProperty"
    value="propertyName"
    mode="decimal"
    locale="en-US"
    :minFractionDigits="0"
    :maxFractionDigits="20"
    showButtons
    buttonLayout="stacked"
    :placeholder="placeHolderValue"
    :step="stepValue"
    :min="minValue"
    :max="maxValue"
    increment-button-class="p-button-text p-button-secondary"
    decrement-button-class="p-button-text p-button-secondary" />
</template>

<style scoped>
/* remove the border so it better fits to the table look,
   remove the box shadow, otherwise it looks buggy */
:deep(.p-inputtext) {
  border: none !important;
  box-shadow: none !important;
}
</style>
