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
    console.log('get value for ', props.absolutePath);
    const path = pathToString(props.absolutePath);
    let selectedOption = useSessionStore().currentSelectedOneOfOptions.get(path);

    // When the user has already made a selection but in the meantime the oneOfSelectionProperty was hidden and then
    // initialized again, the selection of the user is a different object instance than the ones in the new oneOf
    // property component. To make up for that, this code updates the object instance to the new one.
    if (selectedOption && !possibleValues.includes(selectedOption)) {
      console.log(
        'update value ',
        {...selectedOption},
        ' for ',
        path,
        ' with options ',
        possibleValues
      );
      selectedOption = findOptionBySubSchemaIndex(selectedOption.index);
      useSessionStore().currentSelectedOneOfOptions.set(path, selectedOption!!);
      console.log('updated value to ', {...selectedOption}, ' for ', path);
    }

    console.log('found value ', selectedOption, ' for ', path);
    return selectedOption;
  },

  set(newValue) {
    const selectedOption: OneOfAnyOfSelectionOption | undefined = newValue;

    if (selectedOption) {
      const path = pathToString(props.absolutePath);
      useSessionStore().currentSelectedOneOfOptions.set(path, selectedOption!!);
      emit('update_tree');
    }
  },
});

onMounted(() => {
  if (valueProperty.value === undefined) {
    inferOneOfUserSelection();
  } else {
    console.log(
      'mount oneOf propp. already has selection  for path ',
      props.absolutePath,
      ' which is ',
      valueProperty.value
    );
  }
});

function inferOneOfUserSelection() {
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
  } else {
    console.log('already has selection yet for path ', pathAsString);
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
