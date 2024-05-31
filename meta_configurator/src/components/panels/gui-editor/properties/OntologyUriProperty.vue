<!--
List dropdown for enum properties, also used for properties with multiple examples.
-->
<script setup lang="ts">
import {computed, type ComputedRef, type Ref, ref} from 'vue';
import Dropdown from 'primevue/dropdown';
import _ from 'lodash';
import {dataToString} from '@/utility/dataToString';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationService';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';
import {findSuggestionsForSearchTerm} from '@/rdf/findSuggestionsForSearchTerm';
import {findJsonLdPrefixes} from '@/rdf/findJsonLdPrefixes';
import type {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchemaWrapper;
  propertyData: any | undefined;
  validationResults: ValidationResult;
  sessionMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: any): void;
}>();

const mustBeClassOrProperty =
  props.propertySchema.metaConfigurator!.ontology!.mustBeClassOrProperty;

const currentData = getDataForMode(props.sessionMode);

const possibleValues: Ref<string[]> = ref([]);

// computed property to determine possible prefixes
const contextPrefixes: ComputedRef<[string, string][]> = computed(() => {
  return findJsonLdPrefixes(currentData.data.value);
});

const possiblePrefixes: ComputedRef<string[]> = computed(() => {
  return contextPrefixes.value.map(prefix => prefix[0]);
});

const valueProperty = computed({
  get() {
    return valueToSelectionOption(determineValue(props.propertyData), false);
  },
  set(newValueOption: {name: string; value: any} | string | undefined) {
    const currentPrefix = determinePrefix(props.propertyData);
    const newValue = typeof newValueOption === 'object' ? newValueOption.value : newValueOption;
    const newFullValue = joinPrefixAndValue(currentPrefix, newValue, false);
    emit('update:propertyData', newFullValue);

    updatePossibleValues(newValue, currentPrefix);
  },
});

const valuePropertyPrefix = computed({
  get() {
    return valueToSelectionOption(determinePrefix(props.propertyData), true);
  },
  set(newPrefixOption: {name: string; value: any} | string | undefined) {
    const currentValue = determineValue(props.propertyData);
    const newPrefix = typeof newPrefixOption === 'object' ? newPrefixOption.value : newPrefixOption;
    const newFullValue = joinPrefixAndValue(newPrefix, currentValue, false);
    emit('update:propertyData', newFullValue);

    updatePossibleValues(currentValue, newPrefix);
  },
});

function determinePrefix(fullValue: any) {
  if (typeof fullValue === 'string') {
    if (fullValue.includes(':')) {
      return fullValue.split(':')[0];
    }
  }
  return undefined;
}

function determineValue(fullValue: any) {
  if (typeof fullValue === 'string') {
    if (fullValue.includes(':')) {
      return fullValue.split(':')[1];
    } else {
      return fullValue;
    }
  }
  return undefined;
}

function determinePrefixMeaning(prefix: string) {
  const prefixMeaning = contextPrefixes.value.find(prefixMeaning => prefixMeaning[0] === prefix);
  if (prefixMeaning) {
    return prefixMeaning[1];
  }
  return undefined;
}

function joinPrefixAndValue(
  prefix: string | undefined,
  value: string | undefined,
  resolvePrefix: boolean
) {
  if (!prefix && !value) {
    return undefined;
  }
  if (!prefix) {
    return value;
  }
  if (resolvePrefix) {
    prefix = determinePrefixMeaning(prefix);
  }
  if (!value) {
    return prefix + ':';
  }
  return `${prefix}:${value}`;
}

async function updatePossibleValues(
  userInput: string | undefined,
  prefix: string | undefined = undefined
) {
  possibleValues.value = await findSuggestionsForSearchTerm(
    userInput || '',
    determinePrefixMeaning(prefix || ''),
    mustBeClassOrProperty
  );
}

function valueToSelectionOption(value: any, forPrefix: boolean = false): any {
  if (value === undefined) {
    return undefined;
  }
  const possibleVals = forPrefix ? possiblePrefixes.value : possibleValues.value;
  // check if value is one of the possible values
  if (!possibleVals.some(possibleValue => _.isEqual(possibleValue, value))) {
    return value; // don't wrap in object if not in possible values, otherwise the dropdown cannot correctly select the value
  }
  const formattedValue = dataToString(value);

  return {
    name: formattedValue,
    value: value,
  };
}

const allOptions = computed(() => {
  return possibleValues.value.map(val => valueToSelectionOption(val, false));
});
const allPrefixOptions = computed(() => {
  return possiblePrefixes.value.map(val => valueToSelectionOption(val, true));
});
</script>

<template>
  <Dropdown
    class="tableInput w-full"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="valuePropertyPrefix"
    :editable="true"
    :options="allPrefixOptions"
    :disabled="isReadOnly(props.propertySchema)"
    optionLabel="name"
    @keydown.stop
    :placeholder="`Select ${props.propertyName} prefix`" />
  <Dropdown
    class="tableInput w-full"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="valueProperty"
    :editable="true"
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
