<script setup lang="ts">
import {computed, ref} from 'vue';
import InputText from 'primevue/inputtext';
import type {PathElement} from '@/model/path';
import {generatePlaceholderText} from '@/helpers/propertyPlaceholderGenerator';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {ValidationResults} from '@/helpers/validationService';
import Calendar from 'primevue/calendar';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: string | undefined;
  propertySchema: JsonSchema;
  validationResults: ValidationResults;
  format: string;
}>();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: string | undefined): void;
}>();

// new reference to the property data, so that we can emit the update event
// only when the user is done editing and not on every keystroke
const newPropertyData = ref(props.propertyData);

function updateValue() {
  emit('update:propertyData', newPropertyData.value);
}

const getComponentForFormat = computed(() => {
  if (props.format === 'date-time') {
    return 'Calendar';
  } else {
    return 'InputText';
  }
});
</script>

<template>
  <div>
    <component :is="getComponentForFormat" />

    <InputText
      :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
      class="h-8 tableInput"
      :model-value="props.propertyData"
      @update:model-value="value => (newPropertyData = value)"
      :placeholder="generatePlaceholderText(props.propertySchema, props.propertyName)"
      @blur="updateValue"
      @keydown.stop
      @keyup.enter="updateValue" />

    <Calendar
      v-if="props.format === 'date-time'"
      v-model="newPropertyData"
      :showIcon="true"
      :showButtonBar="true"
      :dateFormat="'mm/dd/yy'"></Calendar>
  </div>
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
