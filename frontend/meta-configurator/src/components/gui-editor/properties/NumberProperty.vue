<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';
import {computed} from 'vue';
import type {JsonSchema} from '@/model/JsonSchema';

const props = defineProps<{
  propertyName: string;
  propertyData: number;
  propertySchema: JsonSchema;
}>();

const minValue = computed(() => {
  return props.propertySchema.exclusiveMinimum ?
        props.propertySchema.exclusiveMinimum + props.propertySchema.multipleOf : props.propertySchema.minimum;
});

const maxValue = computed(() => {
  return props.propertySchema.exclusiveMaximum ?
        props.propertySchema.exclusiveMaximum + props.propertySchema.multipleOf : props.propertySchema.maximum;
});

const stepValue = computed(() => {
  return props.propertySchema.multipleOf ?? 0.1;
});

const emit = defineEmits<{
  (e: 'update_property_value', newValue: number): void;
}>();

const valueProperty = computed({
  get() {
    return props.propertyData;
  },
  set(newValue) {
    emit('update_property_value', newValue);
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
