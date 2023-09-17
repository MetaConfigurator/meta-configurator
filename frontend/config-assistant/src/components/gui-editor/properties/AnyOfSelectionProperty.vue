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

onMounted(() => {
  if (valueProperty.value === undefined && props.propertyData !== undefined) {
    // inferAnyOfUserSelection();
  }
});

function inferAnyOfUserSelection() {
  const pathAsString = pathToString(props.absolutePath);
  const validationService = useSessionStore().validationService;

  if (!useSessionStore().currentSelectedAnyOfOptions.has(pathAsString)) {
    // User has not yet made a anyOf sub-schema selection for this path
    // --> auto infer a sub-schema
    // Idea: go through all sub-schemas. Select all sub-schemas for which the data is valid
    const schemasIndexForWhichDataIsValid: number[] = [];

    props.propertySchema.anyOf.forEach((subSchema: JsonSchema, index: number) => {
      const valid = validationService.validateSubSchema(
        subSchema.jsonSchema!!,
        // todo: consider whether the way this key (that is used for caching the validation function for the schema)
        // will work for nested oneOfs
        pathToString(props.absolutePath) + '.anyOf[' + index + ']',
        props.propertyData
      ).valid;
      if (valid) {
        schemasIndexForWhichDataIsValid.push(index);
      }
    });

    if (schemasIndexForWhichDataIsValid.length == 1 || schemasIndexForWhichDataIsValid.length > 0) {
      const optionsToSelect: OneOfAnyOfSelectionOption[] = schemasIndexForWhichDataIsValid.map(
        index => {
          return findOptionBySubSchemaIndex(index)!!;
        }
      );
      useSessionStore().currentSelectedAnyOfOptions.set(pathAsString, optionsToSelect);
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
