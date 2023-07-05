<script setup lang="ts">
import {computed} from 'vue';
import InputNumber from 'primevue/inputnumber';

const props = defineProps<{
  propertyName: string;
  propertyData: number;
  maxValue: number;
  minValue: number;
  exclusiveMaxValue: number;
  exclusiveMinValue: number;
}>();

const minValue = computed(() => {
  return props.exclusiveMinValue ? props.exclusiveMinValue + 1 : props.minValue;
});

const maxValue = computed(() => {
  return props.exclusiveMaxValue ? props.exclusiveMaxValue - 1 : props.maxValue;
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
    input-id="integeronly"
    locale="us"
    :use-grouping="false"
    showButtons
    buttonLayout="stacked"
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
