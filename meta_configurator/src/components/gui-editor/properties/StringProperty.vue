<!-- Text input for string properties -->
<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import InputText from 'primevue/inputtext';
import {generatePlaceholderText} from '@/utility/propertyPlaceholderGenerator';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationService';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: string | undefined;
  propertySchema: JsonSchemaWrapper;
  validationResults: ValidationResult;
}>();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: string | undefined): void;
}>();

const polishedPropertyData = computed(() => {
  if (props.propertyData === undefined) {
    return '';
  }
  if (typeof props.propertyData === 'object') {
    return JSON.stringify(props.propertyData);
  }
  return props.propertyData;
});

// new reference to the property data, so that we can emit the update event
// only when the user is done editing and not on every keystroke
const newPropertyData = ref(props.propertyData);

// update the newPropertyData reference when the props change
watch(polishedPropertyData, setNewPropertyData);

function setNewPropertyData(newValue: string) {
  newPropertyData.value = newValue;
}

function updateValue() {
  emit('update:propertyData', newPropertyData.value);
}
</script>

<template>
  <InputText
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    class="h-8 tableInput"
    :model-value="polishedPropertyData"
    @update:model-value="setNewPropertyData"
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
