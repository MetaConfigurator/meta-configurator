<!-- Reference property: autocomplete for $ref values -->
<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import AutoComplete from 'primevue/autocomplete';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationUtils';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';
import {getSchemaForMode, getDataForMode} from '@/data/useDataLink';
import {useSettings} from '@/settings/useSettings';
import type {SessionMode} from '@/store/sessionMode';
import {SessionMode as SessionModeEnum} from '@/store/sessionMode';
import InputText from 'primevue/inputtext';
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

// In SchemaEditor mode, get definitions from the schema being edited (userSchemaData)
// In other modes, get definitions from the schema that validates the current data
const availableDefinitions = computed<string[]>(() => {
  if (props.sessionMode === SessionModeEnum.SchemaEditor) {
    // In SchemaEditor, get definitions from the user schema data (what's being edited)
    const userSchemaData = getDataForMode(SessionModeEnum.SchemaEditor).data.value;
    return getAvailableDefinitionPaths(userSchemaData);
  } else {
    // In other modes, use the normal schema
    const managedSchema = getSchemaForMode(props.sessionMode);
    return managedSchema.availableDefinitions.value;
  }
});

// is the current value an external reference (no #/)
const isExternalReference = computed(() => {
  return (
    props.propertyData !== undefined &&
    props.propertyData !== '' &&
    !props.propertyData.startsWith('#/')
  );
});

const currentValue = ref(props.propertyData ?? '');

watch(
  () => props.propertyData,
  newVal => {
    currentValue.value = newVal ?? '';
  }
);

// filter suggestions based on what user types
const filteredSuggestions = ref<string[]>([]);

// watch currentValue and update suggestions as user types
watch(currentValue, newVal => {
  const query = (newVal ?? '').toLowerCase();
  if (query === '') {
    // show all definitions if empty
    filteredSuggestions.value = availableDefinitions.value;
  } else {
    filteredSuggestions.value = availableDefinitions.value.filter(path =>
      path.toLowerCase().includes(query)
    );
  }
});

function searchSuggestions(event: {query: string}) {
  const query = event.query.toLowerCase();
  filteredSuggestions.value = availableDefinitions.value.filter(path =>
    path.toLowerCase().includes(query)
  );
}

function updateValue(newValue: string | {value: string} | undefined) {
  const val = typeof newValue === 'object' ? newValue?.value : newValue;
  emit('update:propertyData', val);
}
</script>

<template>
  <!-- if external reference, just show plain input — don't disturb with suggestions -->
  <InputText
    v-if="isExternalReference"
    class="h-8 tableInput w-full"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="currentValue"
    :disabled="isReadOnly(props.propertySchema)"
    @blur="updateValue(currentValue)"
    @keyup.enter="updateValue(currentValue)"
    @keydown.down.stop
    @keydown.up.stop
    @keydown.left.stop
    @keydown.right.stop
    placeholder="External reference URL" />

  <!-- internal reference: show autocomplete with suggestions -->
  <AutoComplete
    v-else
    ref="autocompleteRef"
    class="tableInput w-full"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    v-model="currentValue"
    :suggestions="filteredSuggestions"
    :editable="true"
    :disabled="isReadOnly(props.propertySchema)"
    :input-style="{width: '100%'}"
    @complete="searchSuggestions"
    @item-select="updateValue($event.value)"
    @blur="updateValue(currentValue)"
    @keyup.enter="updateValue(currentValue)"
    @keydown.down.stop
    @keydown.up.stop
    @keydown.left.stop
    @keydown.right.stop
    placeholder="#/$defs/MyType" />
</template>

<style scoped>
.tableInput {
  border: v-bind("settings.guiEditor.showBorderAroundInputFields ? '1px solid #d1d5db' : 'none'");
  box-shadow: none;
}
</style>
