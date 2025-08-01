<!--
Ontology Uri Property: user can select a prefix and a uri value for a property
-->
<script setup lang="ts">
import {computed, type ComputedRef, type Ref, ref} from 'vue';
import AutoComplete from 'primevue/autocomplete';
import _ from 'lodash';
import {dataToString} from '@/utility/dataToString';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationService';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';
import {findSuggestionsForSearchTerm} from '@/utility/rdf/findSuggestionsForSearchTerm';
import {findJsonLdPrefixes} from '@/utility/rdf/findJsonLdPrefixes';
import type {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchemaWrapper;
  propertyData: any | undefined;
  validationResults: ValidationResult;
  sessionMode: SessionMode;
}>();

const settings = useSettings();

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
    if (hasPrefix(fullValue)) {
      return fullValue.split(':')[0];
    }
  }
  return undefined;
}

function determineValue(fullValue: any) {
  if (typeof fullValue === 'string') {
    if (hasPrefix(fullValue)) {
      return fullValue.split(':')[1];
    } else {
      return fullValue;
    }
  }
  return undefined;
}

function hasPrefix(fullValue: string): boolean {
  // do not consider it a prefix, if the value is an url
  return (
    fullValue.replace('://', '').includes(':') &&
    !fullValue.startsWith('http:') &&
    !fullValue.startsWith('https:')
  );
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
  <AutoComplete
    class="tableInput w-full prefix-autocomplete widthThird"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="valuePropertyPrefix"
    :editable="true"
    :suggestions="allPrefixOptions"
    :disabled="isReadOnly(props.propertySchema)"
    optionLabel="name"
    :input-style="{width: '100%'}"
    @keydown.down.stop
    @keydown.up.stop
    @keydown.left.stop
    @keydown.right.stop
    placeholder="prefix" />
  <AutoComplete
    class="tableInput w-full value-autocomplete widthTwoThirds"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="valueProperty"
    :editable="true"
    :suggestions="allOptions"
    :disabled="isReadOnly(props.propertySchema)"
    :input-style="{width: '100%'}"
    optionLabel="name"
    @keydown.down.stop
    @keydown.up.stop
    @keydown.left.stop
    @keydown.right.stop
    placeholder="uri" />
</template>

<style scoped>
.tableInput {
  border: v-bind("settings.guiEditor.showBorderAroundInputFields ? '1px solid #d1d5db' : 'none'");
  box-shadow: none;
}
::placeholder {
  color: #a8a8a8;
}
.widthThird {
  width: 33%;
}
.widthTwoThirds {
  width: 66%;
}
</style>
