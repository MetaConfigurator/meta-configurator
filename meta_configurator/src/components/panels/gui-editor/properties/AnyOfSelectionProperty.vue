<!--
Component for selecting one or more sub-schemas of an anyOf property.
-->
<script setup lang="ts">
import type {WritableComputedRef} from 'vue';
import {computed} from 'vue';
import MultiSelect from 'primevue/multiselect';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {Path, PathElement} from '@/utility/path';
import {schemaSelectionKey as selectionKeyForPath} from '@/data/schemaSelectionKey';
import type {SessionMode} from '@/store/sessionMode';
import {getSessionForMode, getUserSelectionForMode} from '@/data/useDataLink';
import {OneOfAnyOfSelectionOption, schemaSelectionOptions} from '@/data/oneOfAnyOfSelectionOption';
import {useSettings} from '@/settings/useSettings';
import {safeMergeSchemas} from '@/schema/mergeAllOfs';
import {applySchemaConstantsOnData} from './applySchemaConstantsOnData';
import _ from 'lodash';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchemaWrapper;
  propertyData: any | undefined;
  absolutePath: Path;
  schemaSelectionKey?: string;
  possibleSchemas: Array<JsonSchemaWrapper>;
  sessionMode: SessionMode;
}>();

const settings = useSettings();
const schemaSelectionKey = computed(
  () => props.schemaSelectionKey ?? selectionKeyForPath(props.absolutePath)
);

const possibleOptions = computed(() => schemaSelectionOptions(props.possibleSchemas));

const emit = defineEmits<{
  (e: 'update:tree'): void;
  (e: 'update:propertyData', newValue: any | undefined): void;
}>();

const valueProperty: WritableComputedRef<OneOfAnyOfSelectionOption[] | undefined> = computed({
  get(): OneOfAnyOfSelectionOption[] | undefined {
    const optionsFromStore = getUserSelectionForMode(props.sessionMode).getSelectedAnyOfOptions(
      schemaSelectionKey.value
    );
    if (!optionsFromStore) {
      return undefined;
    }
    // use instances from the possible options array
    // otherwise the multiselect will not show the selected options
    // as it compares by reference
    return optionsFromStore
      .map(option => possibleOptions.value[option.index])
      .filter((option): option is OneOfAnyOfSelectionOption => option !== undefined);
  },

  set(selectedOptions: OneOfAnyOfSelectionOption[] | undefined) {
    if (selectedOptions) {
      getUserSelectionForMode(props.sessionMode).setSelectedAnyOfOptions(
        schemaSelectionKey.value,
        selectedOptions
      );
      getSessionForMode(props.sessionMode).expand(props.absolutePath);
      applySelectedConstants(selectedOptions);
      emit('update:tree');
    }
  },
});

function applySelectedConstants(selectedOptions: OneOfAnyOfSelectionOption[]) {
  // Clearing the selection must not change the document. When several options
  // are selected, apply only their merged constraints; conflicting choices must
  // not overwrite data according to whichever option happened to come last.
  if (selectedOptions.length === 0) return;
  const baseSchema = {...props.propertySchema.jsonSchema};
  delete baseSchema.anyOf;
  const mergedSchema = safeMergeSchemas(
    baseSchema,
    ...selectedOptions.map(option => props.possibleSchemas[option.index]?.jsonSchema ?? {})
  );
  const result = applySchemaConstantsOnData(mergedSchema, props.propertyData);
  if (!_.isEqual(result, props.propertyData)) {
    emit('update:propertyData', result);
  }
}
</script>

<template>
  <div>
    <MultiSelect
      class="tableInput w-full"
      v-model="valueProperty"
      :options="possibleOptions"
      :placeholder="`Select sub-schemas`" />
  </div>
</template>

<style scoped>
div {
  display: flex;
  flex-direction: row;
  height: 30px;
  line-height: 10px;
}
.tableInput {
  border: v-bind("settings.guiEditor.showBorderAroundInputFields ? '1px solid #d1d5db' : 'none'");
  box-shadow: none;
}
::placeholder {
  color: #a8a8a8;
}
</style>
