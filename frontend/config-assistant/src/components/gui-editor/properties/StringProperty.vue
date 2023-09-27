<script setup lang="ts">
import {ref, watch} from 'vue';
import InputText from 'primevue/inputtext';
import type {PathElement} from '@/model/path';
import {generatePlaceholderText} from '@/helpers/propertyPlaceholderGenerator';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {ValidationResults} from '@/helpers/validationService';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: string | undefined;
  propertySchema: JsonSchema;
  validationResults: ValidationResults;
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
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    class="h-8 tableInput"
    v-model="valueProperty"
    :placeholder="generatePlaceholderText(props.propertySchema, props.propertyName)"
    @blur="updateValue"
    @keydown.stop
    @keyup.enter="updateValue" />
</template>

<style scoped>
/* remove border so it fits the look of the table better */
.tableInput {
  border: none;
}
::placeholder {
  color: #a8a8a8;
}
</style>
