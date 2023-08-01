<script setup lang="ts">
import {computed} from 'vue';
import InputNumber from 'primevue/inputnumber';
import type {PathElement} from '@/model/path';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {placeHolderValue} from '@/helpers/PlaceHolderForExamples';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: number | undefined;
  propertySchema: JsonSchema;
}>();

const minValue = computed(() => {
  if (props.propertySchema.exclusiveMinimum !== undefined) {
    return props.propertySchema.exclusiveMinimum + 1;
  } else if (props.propertySchema.minimum !== undefined) {
    return props.propertySchema.minimum;
  } else {
    return undefined;
  }
});

const maxValue = computed(() => {
  if (props.propertySchema.exclusiveMaximum !== undefined) {
    return props.propertySchema.exclusiveMaximum - 1;
  } else if (props.propertySchema.maximum !== undefined) {
    return props.propertySchema.maximum;
  } else {
    return undefined;
  }
});

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
    v-model="valueProperty"
    value="propertyName"
    input-id="integeronly"
    locale="us"
    :use-grouping="false"
    showButtons
    buttonLayout="stacked"
    :placeholder="placeHolderValue(props.propertySchema)"
    :step="1"
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
