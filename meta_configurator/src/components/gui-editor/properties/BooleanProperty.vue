<!--
Component for editing boolean properties.
They are represented as a select button with two options: true and false.
-->
<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';
import {computed, ref} from 'vue';
import type {PathElement} from '@/model/path';
import type {JsonSchema} from '@/schema/jsonSchema';
import type {ValidationResults} from '@/utility/validationService';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: boolean | undefined;
  parentSchema: JsonSchema | undefined;
  validationResults: ValidationResults;
}>();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: boolean | undefined): void;
}>();

const options = ref([
  {name: 'true', value: true},
  {name: 'false', value: false},
]);

const valueProperty = computed({
  get() {
    return props.propertyData;
  },
  set(newValue) {
    if (newValue === null && (isRequired() || isElementOfArray())) {
      // if the property is required or an array, we should not set it to null
      // therefore, we flip the value instead
      emit('update:propertyData', !props.propertyData);
      return;
    }
    if (newValue === null) {
      emit('update:propertyData', undefined);
    } else {
      emit('update:propertyData', newValue);
    }
  },
});

function isRequired() {
  return props.parentSchema?.isRequired(props.propertyName as string);
}

function isElementOfArray() {
  return props.parentSchema?.hasType('array');
}
</script>

<template>
  <div class="pl-2 pt-0.5">
    <SelectButton
      :class="{'p-invalid': !props.validationResults.valid}"
      v-model="valueProperty"
      :options="options"
      @keydown.stop
      option-label="name"
      option-value="value" />
  </div>
</template>

<style scoped>
:deep(.p-button) {
  padding: 0 0.5rem;
}
:deep(.p-button-label) {
  font-weight: 500;
}
::placeholder {
  color: #a8a8a8;
}
</style>
