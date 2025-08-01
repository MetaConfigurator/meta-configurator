<!--
List dropdown for enum properties, also used for properties with multiple examples.
-->
<script setup lang="ts">
import {computed} from 'vue';
import Select from 'primevue/select';
import _ from 'lodash';
import {dataToString} from '@/utility/dataToString';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationService';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  propertyName: PathElement;
  possibleValues: Array<any>;
  propertySchema: JsonSchemaWrapper;
  propertyData: any | undefined;
  validationResults: ValidationResult;
}>();

const settings = useSettings();

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
    // if the value is an empty object and the schema expects a string, we return an empty string
    if (
      value !== null &&
      typeof value === 'object' &&
      Object.keys(value).length === 0 &&
      props.propertySchema.hasType('string')
    ) {
      return '';
    }

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
  <Select
    class="tableInput w-full"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="valueProperty"
    :editable="isEditable()"
    :options="allOptions"
    :disabled="isReadOnly(props.propertySchema)"
    optionLabel="name"
    @keydown.down.stop
    @keydown.up.stop
    @keydown.left.stop
    @keydown.right.stop
    :placeholder="`Select ${props.propertyName}`" />
</template>

<style scoped>
.tableInput {
  box-shadow: none;
  border: v-bind("settings.guiEditor.showBorderAroundInputFields ? '1px solid #d1d5db' : 'none'");
}
::placeholder {
  color: #a8a8a8;
}
</style>
