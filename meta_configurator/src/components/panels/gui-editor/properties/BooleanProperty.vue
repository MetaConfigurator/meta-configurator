<!--
Component for editing boolean properties.
They are represented as a select button with two options: true and false.
-->
<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';
import {computed, ref} from 'vue';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationService';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: boolean | undefined;
  propertySchema: JsonSchemaWrapper;
  validationResults: ValidationResult;
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
    if (newValue === null || newValue === undefined) {
      // null is used when the user deselects the select button
      // we then switch to the other value
      emit('update:propertyData', !props.propertyData);
    } else {
      emit('update:propertyData', newValue);
    }
  },
});
</script>

<template>
  <div class="pl-2 pt-0.5">
    <SelectButton
      :class="{'p-invalid': !props.validationResults.valid}"
      v-model="valueProperty"
      :options="options"
      :disabled="isReadOnly(props.propertySchema)"
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
</style>
