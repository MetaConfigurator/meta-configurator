<!-- Date picker for string properties with date format -->
<script setup lang="ts">
import {ref, watch} from 'vue';
import DatePicker from 'primevue/datepicker';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationUtils';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: unknown;
  propertySchema: JsonSchemaWrapper;
  validationResults: ValidationResult;
}>();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: string | undefined): void;
}>();

// convert string to Date for the picker
const dateValue = ref<Date | undefined>(parseDate(props.propertyData));

watch(
  () => props.propertyData,
  newVal => {
    dateValue.value = parseDate(newVal);
  }
);

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

function updateValue(value: Date | (Date | null)[] | Date[] | null | undefined) {
  // DatePicker is used in single-date mode here, so we only handle a single Date (or empty).
  const newDate = value instanceof Date ? value : undefined;
  if (!newDate || Number.isNaN(newDate.getTime())) {
    emit('update:propertyData', undefined);
    return;
  }
  const isoString = newDate.toISOString().split('T')[0];
  emit('update:propertyData', isoString);
}
</script>

<template>
  <DatePicker
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    class="h-8"
    v-model="dateValue"
    dateFormat="yy-mm-dd"
    :disabled="isReadOnly(props.propertySchema)"
    @update:modelValue="updateValue" />
</template>
