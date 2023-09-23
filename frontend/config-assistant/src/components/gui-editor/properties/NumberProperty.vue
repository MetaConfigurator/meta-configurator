<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';
import {computed} from 'vue';
import type {PathElement} from '@/model/path';
import {JsonSchema} from '@/helpers/schema/JsonSchema';
import {generatePlaceholderText} from '@/helpers/propertyPlaceholderGenerator';
import {ValidationResults} from '@/helpers/validationService';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: number | undefined;
  propertySchema: JsonSchema;
  validationResults: ValidationResults;
}>();

const stepValue = computed(() => {
  return props.propertySchema.multipleOf ?? 0.1;
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

function isValid(): boolean {
  return props.validationResults.valid;
}
</script>

<template>
  <InputNumber
    class="h-8"
    :class="{'underline decoration-wavy decoration-red-600': !isValid()}"
    v-model="valueProperty"
    value="propertyName"
    mode="decimal"
    locale="en-US"
    :minFractionDigits="0"
    :maxFractionDigits="20"
    showButtons
    buttonLayout="stacked"
    :placeholder="generatePlaceholderText(props.propertySchema, props.propertyName)"
    :step="stepValue"
    @keydown.stop
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
