<!--
Component for selecting one or more sub-schemas of an anyOf property.
-->
<script setup lang="ts">
import type {WritableComputedRef} from 'vue';
import {computed} from 'vue';
import MultiSelect from 'primevue/multiselect';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {Path, PathElement} from '@/utility/path';
import type {SessionMode} from '@/store/sessionMode';
import {getSessionForMode, getUserSelectionForMode} from '@/data/useDataLink';
import {OneOfAnyOfSelectionOption, schemaOptionToString} from '@/data/oneOfAnyOfSelectionOption';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchemaWrapper;
  propertyData: any | undefined;
  absolutePath: Path;
  possibleSchemas: Array<JsonSchemaWrapper>;
  sessionMode: SessionMode;
}>();

const possibleOptions = props.possibleSchemas.map(
  (subSchema, index) => new OneOfAnyOfSelectionOption(schemaOptionToString(subSchema, index), index)
);

const emit = defineEmits<{
  (e: 'update:tree'): void;
}>();

function findOptionBySubSchemaIndex(index: number): OneOfAnyOfSelectionOption {
  for (let option of possibleOptions) {
    if (option.index === index) {
      return option;
    }
  }
  throw new Error(`Could not find option with index ${index}`);
}

const valueProperty: WritableComputedRef<OneOfAnyOfSelectionOption[] | undefined> = computed({
  get(): OneOfAnyOfSelectionOption[] | undefined {
    const optionsFromStore = getUserSelectionForMode(props.sessionMode).getSelectedAnyOfOptions(
      props.absolutePath
    );
    if (!optionsFromStore) {
      return undefined;
    }
    // use instances from the possible options array
    // otherwise the multiselect will not show the selected options
    // as it compares by reference
    return optionsFromStore.map(option => findOptionBySubSchemaIndex(option.index));
  },

  set(selectedOptions: OneOfAnyOfSelectionOption[] | undefined) {
    if (selectedOptions) {
      getUserSelectionForMode(props.sessionMode).setSelectedAnyOfOptions(
        props.absolutePath,
        selectedOptions
      );
      getSessionForMode(props.sessionMode).expand(props.absolutePath);
      emit('update:tree');
    }
  },
});
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
  border: none;
  box-shadow: none;
}
::placeholder {
  color: #a8a8a8;
}
</style>
