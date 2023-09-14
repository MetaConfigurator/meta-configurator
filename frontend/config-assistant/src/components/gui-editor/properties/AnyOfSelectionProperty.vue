<script setup lang="ts">
import {computed, defineProps} from 'vue';
import MultiSelect from 'primevue/multiselect';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {useSessionStore} from '@/store/sessionStore';
import {Path, PathElement} from '@/model/path';
import {pathToString} from '@/helpers/pathHelper';
import {OneOfAnyOfSelectionOption, schemaOptionToString} from '@/model/OneOfAnyOfSelectionOption';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchema;
  propertyData: any | undefined;
  absolutePath: Path;
  possibleSchemas: Array<JsonSchema>;
}>();

const possibleValues = props.possibleSchemas.map(
  (subSchema, index) => new OneOfAnyOfSelectionOption(schemaOptionToString(subSchema, index), index)
);

const emit = defineEmits<{
  (e: 'update_tree'): void;
}>();

const valueProperty = computed({
  get() {
    const path = pathToString(props.absolutePath);
    return useSessionStore().currentSelectedAnyOfOptions.get(path);
  },

  set(newValue) {
    const selectedOption: OneOfAnyOfSelectionOption[] | undefined = newValue;

    if (selectedOption) {
      const path = pathToString(props.absolutePath);
      useSessionStore().currentSelectedAnyOfOptions.set(path, selectedOption);
      emit('update_tree');
    }
  },
});
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
