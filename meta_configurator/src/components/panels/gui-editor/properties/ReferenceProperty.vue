<script setup lang="ts">
import {ref, watch, nextTick} from 'vue';
import AutoComplete from 'primevue/autocomplete';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationUtils';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';
import {getDataForMode} from '@/data/useDataLink';
import {useSettings} from '@/settings/useSettings';
import type {SessionMode} from '@/store/sessionMode';
import {SessionMode as SessionModeEnum} from '@/store/sessionMode';
import {getAvailableDefinitionPaths} from '@/schema/schemaReadingUtils';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: string | undefined;
  propertySchema: JsonSchemaWrapper;
  validationResults: ValidationResult;
  sessionMode: SessionMode;
}>();

const settings = useSettings();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: string | undefined): void;
}>();

const currentValue = ref(props.propertyData ?? '');
const filteredSuggestions = ref<string[]>([]);
const autoCompleteRef = ref();

watch(
  () => props.propertyData,
  newVal => {
    currentValue.value = newVal ?? '';
  }
);

function getDefinitions() {
  const userSchemaData = getDataForMode(SessionModeEnum.SchemaEditor).data.value;
  return getAvailableDefinitionPaths(userSchemaData);
}

function onFocus() {
  filteredSuggestions.value = getDefinitions();
  nextTick(() => autoCompleteRef.value?.show());
}

function onInput(event: Event) {
  const val = (event.target as HTMLInputElement).value;
  currentValue.value = val;
  const query = val.toLowerCase();
  filteredSuggestions.value = query === ''
    ? getDefinitions()
    : getDefinitions().filter(p => p.toLowerCase().includes(query));
}

function searchSuggestions(event: {query: string}) {
  const query = event.query.toLowerCase();
  filteredSuggestions.value = query === ''
    ? getDefinitions()
    : getDefinitions().filter(p => p.toLowerCase().includes(query));
}

function onItemSelect(event: {value: string}) {
  currentValue.value = event.value;
  emit('update:propertyData', event.value);
}

function onBlur() {
  emit('update:propertyData', currentValue.value || undefined);
}
</script>

<template>
  <AutoComplete
    ref="autoCompleteRef"
    class="tableInput w-full"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="currentValue"
    :suggestions="filteredSuggestions"
    :editable="true"
    :disabled="isReadOnly(props.propertySchema)"
    :input-style="{width: '100%'}"
    :min-length="0"
    placeholder="#/$defs/MyType or external URL"
    @complete="searchSuggestions"
    @focus="onFocus"
    @input="onInput"
    @item-select="onItemSelect"
    @blur="onBlur"
    @keyup.enter="emit('update:propertyData', currentValue || undefined)"
    @keydown.down.stop
    @keydown.up.stop
    @keydown.left.stop
    @keydown.right.stop>
    <template #option="{option}">
      <div @mousedown.prevent="onItemSelect({value: option})">
        {{ option }}
      </div>
    </template>
  </AutoComplete>
</template>

<style scoped>
.tableInput {
  border: v-bind("settings.guiEditor.showBorderAroundInputFields ? '1px solid #d1d5db' : 'none'");
  box-shadow: none;
}
</style>