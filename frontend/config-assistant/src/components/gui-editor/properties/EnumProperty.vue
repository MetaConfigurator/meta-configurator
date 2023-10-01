<!--
List dropdown for enum properties, also used for properties with multiple examples.
-->
<script setup lang="ts">
import {computed} from 'vue';
import Dropdown from 'primevue/dropdown';
import {ValidationResults} from '@/helpers/validationService';

const props = defineProps<{
  propertyName: string;
  possibleValues: Array<any>;
  propertyData: any | undefined;
  validationResults: ValidationResults;
}>();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: any): void;
}>();

const valueProperty = computed({
  get() {
    return valueToSelectionOption(props.propertyData);
  },
  set(newValue: {name: string; value: any} | undefined) {
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
  let formattedValue = `${value}`;
  if (value === null) {
    formattedValue = 'null';
  }
  return {
    name: formattedValue,
    value: value,
  };
}

const allOptions = computed(() => {
  return props.possibleValues.map(val => valueToSelectionOption(val));
});
</script>

<template>
  <div>
    <Dropdown
      class="tableInput w-full"
      :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
      v-model="valueProperty"
      editable
      :options="allOptions"
      optionLabel="name"
      @keydown.stop
      :placeholder="`Select ${props.propertyName}`" />
  </div>
</template>

<style scoped>
div {
  display: flex;
  flex-direction: row;
  height: 30px;
}
.tableInput {
  border: none;
  box-shadow: none;
}
::placeholder {
  color: #a8a8a8;
}
</style>
