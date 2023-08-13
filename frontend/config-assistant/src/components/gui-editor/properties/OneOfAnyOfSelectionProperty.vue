<script setup lang="ts">
import {computed, defineProps} from 'vue';
import Dropdown from 'primevue/dropdown';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {useSessionStore} from '@/store/sessionStore';
import {Path} from '@/model/path';
import {pathToString} from '@/helpers/pathHelper';
import {OneOfAnyOfSelectionOption, schemaOptionToString} from '@/model/OneOfAnyOfSelectionOption';

const props = defineProps<{
  propertyName: string;
  propertySchema: JsonSchema;
  propertyData: any | undefined;
  absolutePath: Path;
}>();

const possibleValues = props.propertySchema.oneOf.map(
  (subSchema, index) => new OneOfAnyOfSelectionOption(schemaOptionToString(subSchema, index), index)
);

const valueProperty = computed({
  get() {
    const path = pathToString(props.absolutePath);
    const result = useSessionStore().currentSelectedOneOfOptions.get(path);
    return result;
  },
  set(newValue) {
    const selectedOption: OneOfAnyOfSelectionOption = newValue;
    const path = pathToString(props.absolutePath);
    useSessionStore().currentSelectedOneOfOptions.set(path, selectedOption);
  },
});
</script>

<template>
  <div>
    <Dropdown
      v-model="valueProperty"
      :options="possibleValues"
      :placeholder="`Select sub-schema`" />
  </div>
</template>

<style scoped>
div {
  display: flex;
  flex-direction: row;
  height: 30px;
}
</style>
