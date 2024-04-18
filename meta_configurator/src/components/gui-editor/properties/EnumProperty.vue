<!--
List dropdown for enum properties, also used for properties with multiple examples.
-->
<script setup lang="ts">
import {computed} from 'vue';
import Dropdown from 'primevue/dropdown';
import _ from 'lodash';
import {dataToString} from '@/utility/dataToString';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationService';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {isReadOnly} from '@/components/gui-editor/configTreeNodeReadingUtils';

const props = defineProps<{
  propertyName: PathElement;
  possibleValues: Array<any>;
  propertySchema: JsonSchemaWrapper;
  propertyData: any | undefined;
  validationResults: ValidationResult;
}>();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: any): void;
}>();

const valueProperty = computed({
  get() {
    return valueToSelectionOption(props.propertyData);
  },
  set(newValue: {name: string; value: any} | string | undefined) {
    if (typeof newValue !== 'object') {
      emit('update:propertyData', newValue);
      return;
    }
    emit('update:propertyData', newValue?.value);
  },
});

/**
 * Converts a value to a selection option.
 * @param value The value to convert.
 */
function valueToSelectionOption(value: any): any {
  if (value === undefined) {
    return undefined;
  }
  // check if value is one of the possible values
  if (!props.possibleValues.some(possibleValue => _.isEqual(possibleValue, value))) {
    return value; // don't wrap in object if not in possible values, otherwise the dropdown cannot correctly select the value
  }
  const formattedValue = dataToString(value);

  return {
    name: formattedValue,
    value: value,
  };
}

const allOptions = computed(() => {
  return props.possibleValues.map(val => valueToSelectionOption(val));
});

function isEditable() {
  // we only allow editing if all possible values are strings
  // because for other types, we would need to convert the user input string to the correct type
  // which is not necessary for enums
  return props.possibleValues.every(val => typeof val === 'string');
}
</script>

<template>
  <Dropdown
    class="tableInput w-full"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="valueProperty"
    :editable="isEditable()"
    :options="allOptions"
    :disabled="isReadOnly(props.propertySchema)"
    optionLabel="name"
    @keydown.stop
    :placeholder="`Select ${props.propertyName}`" />
</template>

<style scoped>
.tableInput {
  border: none;
  box-shadow: none;
}
::placeholder {
  color: #a8a8a8;
}
</style>
