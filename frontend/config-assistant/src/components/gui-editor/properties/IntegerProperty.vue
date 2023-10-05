<script setup lang="ts">
import {computed} from 'vue';
import InputNumber from 'primevue/inputnumber';
import type {PathElement} from '@/model/path';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {generatePlaceholderText} from '@/helpers/propertyPlaceholderGenerator';
import {ValidationResults} from '@/helpers/validationService';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: number | undefined;
  propertySchema: JsonSchema;
  validationResults: ValidationResults;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', newValue: number): void;
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
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="valueProperty"
    value="propertyName"
    input-id="integeronly"
    locale="us"
    @keydown.stop
    :use-grouping="false"
    showButtons
    buttonLayout="stacked"
    :placeholder="generatePlaceholderText(props.propertySchema, props.propertyName)"
    :step="1"
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
::-webkit-input-placeholder {
  /* Chrome/Opera/Safari */
  color: #a8a8a8 !important;
  //opacity: 1;
}
/* For other browsers (Firefox, Edge, etc.) */
::placeholder {
  color: #a8a8a8; /* Same color as above */
}
</style>
