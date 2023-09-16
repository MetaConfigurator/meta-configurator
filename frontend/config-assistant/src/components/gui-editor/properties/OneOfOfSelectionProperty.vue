<script setup lang="ts">
import {computed, defineProps, onMounted, WritableComputedRef} from 'vue';
import Dropdown from 'primevue/dropdown';
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

const valueProperty: WritableComputedRef<OneOfAnyOfSelectionOption | undefined> = computed({
  get() {
    const path = pathToString(props.absolutePath);
    return useSessionStore().currentSelectedOneOfOptions.get(path);
  },

  set(newValue) {
    const selectedOption: OneOfAnyOfSelectionOption | undefined = newValue;

    if (selectedOption) {
      const path = pathToString(props.absolutePath);
      useSessionStore().currentSelectedOneOfOptions.set(path, selectedOption);
      emit('update_tree');
    }
  },
});

onMounted(() => {
  if (valueProperty.value === undefined) {
    inferOneOfUserSelection();
  }
});

function inferOneOfUserSelection() {
  console.log('infer oneOf user selection');
  const pathAsString = pathToString(props.absolutePath);
  const validationService = useSessionStore().validationService;

  if (!useSessionStore().currentSelectedOneOfOptions.has(pathAsString)) {
    console.log('no selection yet for path ', pathAsString);
    // User has not yet made a oneOf sub-schema selection for this path
    // --> auto infer a sub-schema
    // Idea: go through all sub-schemas. If only for one of them the data is valid, this must be the correct one to select.
    const schemasIndexForWhichDataIsValid: number[] = [];

    props.propertySchema.oneOf.forEach((subSchema: JsonSchema, index: number) => {
      const valid = validationService.validateSubSchema(
        subSchema.jsonSchema!!,
        pathToString(props.absolutePath) + '.if',
        props.propertyData
      ).valid;
      if (valid) {
        schemasIndexForWhichDataIsValid.push(index);
      }
      console.log('data is valid for schema ', index, subSchema);
    });

    if (schemasIndexForWhichDataIsValid.length == 1 || schemasIndexForWhichDataIsValid.length > 0) {
      console.log('update selection because some schema are valid');
      const optionToSelect = findOptionBySubSchemaIndex(schemasIndexForWhichDataIsValid[0]);
      useSessionStore().currentSelectedOneOfOptions.set(pathAsString, optionToSelect!!);
    }
  }
}

function findOptionBySubSchemaIndex(index: number): OneOfAnyOfSelectionOption | undefined {
  possibleValues.forEach(option => {
    if (option.index == index) {
      return option;
    }
  });

  return undefined;
}
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
  line-height: 10px;
}
</style>
