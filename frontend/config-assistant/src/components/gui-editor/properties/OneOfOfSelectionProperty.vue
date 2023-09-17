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

const possibleOptions = props.possibleSchemas.map(
  (subSchema, index) => new OneOfAnyOfSelectionOption(schemaOptionToString(subSchema, index), index)
);
const possibleValues = possibleOptions.map(option => option.displayText);

const emit = defineEmits<{
  (e: 'update_tree'): void;
}>();

const valueProperty: WritableComputedRef<string | undefined> = computed({
  get() {
    const path = pathToString(props.absolutePath);
    let selectedOption = useSessionStore().currentSelectedOneOfOptions.get(path);
    return selectedOption?.displayText;
  },

  set(newValue) {
    const selectedOptionText: string | undefined = newValue;

    if (selectedOptionText) {
      const path = pathToString(props.absolutePath);
      const selectedOption = findOptionByDisplayText(selectedOptionText);
      useSessionStore().currentSelectedOneOfOptions.set(path, selectedOption!!);
      emit('update_tree');
    }
  },
});

onMounted(() => {
  if (valueProperty.value === undefined && props.propertyData !== undefined) {
    inferOneOfUserSelection();
  }
});

function inferOneOfUserSelection() {
  const pathAsString = pathToString(props.absolutePath);
  const validationService = useSessionStore().validationService;

  if (!useSessionStore().currentSelectedOneOfOptions.has(pathAsString)) {
    // User has not yet made a oneOf sub-schema selection for this path
    // --> auto infer a sub-schema
    // Idea: go through all sub-schemas. If only for one of them the data is valid, this must be the correct one to select.
    const schemasIndexForWhichDataIsValid: number[] = [];

    props.propertySchema.oneOf.forEach((subSchema: JsonSchema, index: number) => {
      const valid = validationService.validateSubSchema(
        subSchema.jsonSchema!!,
        // todo: consider whether the way this key (that is used for caching the validation function for the schema)
        // will work for nested oneOfs
        pathToString(props.absolutePath) + '.oneOf[' + index + ']',
        props.propertyData
      ).valid;
      if (valid) {
        schemasIndexForWhichDataIsValid.push(index);
      }
    });

    if (schemasIndexForWhichDataIsValid.length == 1) {
      const optionToSelect = findOptionBySubSchemaIndex(schemasIndexForWhichDataIsValid[0]);
      useSessionStore().currentSelectedOneOfOptions.set(pathAsString, optionToSelect!!);
    }
  }
}

function findOptionByDisplayText(displayText: string): OneOfAnyOfSelectionOption | undefined {
  for (let option of possibleOptions) {
    if (option.displayText === displayText) {
      return option;
    }
  }

  return undefined;
}

function findOptionBySubSchemaIndex(index: number): OneOfAnyOfSelectionOption | undefined {
  for (let option of possibleOptions) {
    if (option.index === index) {
      return option;
    }
  }

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
