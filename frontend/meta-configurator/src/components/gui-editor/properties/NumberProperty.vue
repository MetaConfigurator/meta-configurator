<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';
import {computed} from 'vue';

const props = defineProps<{
  propertyName: string;
  propertyData: number;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', propertyName: string, newValue: number): void;
}>();

const valueProperty = computed({
  get() {
    return props.propertyData;
  },
  set(newValue) {
    emit('update_property_value', props.propertyName, newValue);
  },
});
</script>

<template>
  <InputNumber
    v-model="valueProperty"
    value="propertyName"
    mode="decimal"
    minFractionDigits="0"
    maxFractionDigits="20" />
</template>

<style scoped></style>
