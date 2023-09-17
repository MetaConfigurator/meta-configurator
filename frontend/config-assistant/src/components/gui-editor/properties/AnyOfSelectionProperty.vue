<script setup lang="ts">
import {computed, defineProps, onMounted} from 'vue';
import MultiSelect from 'primevue/multiselect';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {useSessionStore} from '@/store/sessionStore';
import {Path, PathElement} from '@/model/path';
import {pathToString} from '@/helpers/pathHelper';
import {OneOfAnyOfSelectionOption, schemaOptionToString} from '@/model/OneOfAnyOfSelectionOption';
import {WritableComputedRef} from 'vue/dist/vue';

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
const possibleValues = possibleOptions.map(option => option.displayText);

const emit = defineEmits<{
  (e: 'update_tree'): void;
}>();

const valueProperty: WritableComputedRef<string[] | undefined> = computed({
  get() {
    const path = pathToString(props.absolutePath);
    let selectedOptions = useSessionStore().currentSelectedAnyOfOptions.get(path);
    return selectedOptions?.map(option => option.displayText);
  },

  set(newValue) {
    const selectedOptionsText: string[] | undefined = newValue;

    if (selectedOptionsText) {
      const path = pathToString(props.absolutePath);
      const selectedOptions = selectedOptionsText.map(
        displayText => findOptionByDisplayText(displayText)!
      );
      useSessionStore().currentSelectedAnyOfOptions.set(path, selectedOptions);
      emit('update_tree');
    }
  },
});

function findOptionByDisplayText(displayText: string): OneOfAnyOfSelectionOption | undefined {
  for (let option of possibleOptions) {
    if (option.displayText === displayText) {
      return option;
    }
  }

  return undefined;
}
</script>

<template>
  <div>
    <MultiSelect
      v-model="valueProperty"
      :options="possibleValues"
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
</style>
