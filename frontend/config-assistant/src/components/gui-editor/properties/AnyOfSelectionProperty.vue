<!--
Component for selecting one or more sub-schemas of an anyOf property.
-->
<script setup lang="ts">
import type {WritableComputedRef} from 'vue';
import {computed} from 'vue';
import MultiSelect from 'primevue/multiselect';
import type {JsonSchema} from '@/schema/JsonSchema';
import {useSessionStore} from '@/store/sessionStore';
import type {Path, PathElement} from '@/model/path';
import {pathToString} from '@/utility/pathUtils';
import {OneOfAnyOfSelectionOption, schemaOptionToString} from '@/model/OneOfAnyOfSelectionOption';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchema;
  propertyData: any | undefined;
  absolutePath: Path;
  possibleSchemas: Array<JsonSchema>;
}>();

const possibleOptions = props.possibleSchemas.map(
  (subSchema, index) => new OneOfAnyOfSelectionOption(schemaOptionToString(subSchema, index), index)
);

const emit = defineEmits<{
  (e: 'update:tree'): void;
}>();

function findOptionBySubSchemaIndex(index): OneOfAnyOfSelectionOption {
  for (let option of possibleOptions) {
    if (option.index === index) {
      return option;
    }
  }
  throw new Error(`Could not find option with index ${index}`);
}

const valueProperty: WritableComputedRef<OneOfAnyOfSelectionOption[] | undefined> = computed({
  get(): OneOfAnyOfSelectionOption[] | undefined {
    const path = pathToString(props.absolutePath);
    const optionsFromStore = useSessionStore().currentSelectedAnyOfOptions.get(path);
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
      const path = pathToString(props.absolutePath);
      useSessionStore().currentSelectedAnyOfOptions.set(path, selectedOptions);
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
