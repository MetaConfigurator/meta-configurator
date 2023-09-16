<script setup lang="ts">
import {computed, defineProps, onMounted} from 'vue';
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
    console.log('get value for ', props.absolutePath);
    const path = pathToString(props.absolutePath);
    let selectedOption = useSessionStore().currentSelectedAnyOfOptions.get(path);

    // When the user has already made a selection but in the meantime the oneOfSelectionProperty was hidden and then
    // initialized again, the selection of the user is a different object instance than the ones in the new oneOf
    // property component. To make up for that, this code updates the object instance to the new one.
    if (
      selectedOption &&
      selectedOption.length > 0 &&
      !possibleValues.includes(selectedOption[0])
    ) {
      selectedOption = selectedOption.map(oldOption => {
        return findOptionBySubSchemaIndex(oldOption.index)!!;
      });
      useSessionStore().currentSelectedAnyOfOptions.set(path, selectedOption!!);
    }

    return selectedOption;
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

onMounted(() => {
  if (valueProperty.value === undefined) {
    inferAnyOfUserSelection();
  }
});

function inferAnyOfUserSelection() {
  const pathAsString = pathToString(props.absolutePath);
  const validationService = useSessionStore().validationService;

  if (!useSessionStore().currentSelectedAnyOfOptions.has(pathAsString)) {
    console.log('no selection yet for path ', pathAsString);
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
      console.log('update selection because some schema are valid');
      const optionsToSelect: OneOfAnyOfSelectionOption[] = schemasIndexForWhichDataIsValid.map(
        index => {
          return findOptionBySubSchemaIndex(index)!!;
        }
      );
      useSessionStore().currentSelectedAnyOfOptions.set(pathAsString, optionsToSelect);
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
