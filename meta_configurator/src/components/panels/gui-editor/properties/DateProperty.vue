<!-- Date picker for string properties with date format -->
<script setup lang="ts">
import {ref, watch} from 'vue';
import DatePicker from 'primevue/datepicker';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationService';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: string | undefined;
  propertySchema: JsonSchemaWrapper;
  validationResults: ValidationResult;
}>();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: string | undefined): void;
}>();

// convert string to Date for the picker
const dateValue = ref<Date | undefined>(
  props.propertyData ? new Date(props.propertyData) : undefined
);

watch(
  () => props.propertyData,
  newVal => {
    dateValue.value = newVal ? new Date(newVal) : undefined;
  }
);

function updateValue(newDate: Date | undefined) {
  if (!newDate) {
    emit('update:propertyData', undefined);
    return;
  }
  // convert Date back to ISO date string (YYYY-MM-DD)
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
