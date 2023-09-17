<script setup lang="ts">
import {computed, defineProps, onMounted, WritableComputedRef} from 'vue';
import Dropdown from 'primevue/dropdown';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {useSessionStore} from '@/store/sessionStore';
import {Path, PathElement} from '@/model/path';
import {pathToString} from '@/helpers/pathHelper';
import {OneOfAnyOfSelectionOption, schemaOptionToString} from '@/model/OneOfAnyOfSelectionOption';
import type {JsonSchemaObjectType} from '@/model/JsonSchemaType';
import {safeMergeSchemas} from '@/helpers/schema/mergeAllOfs';
import _ from 'lodash';

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
  (e: 'update_property_value', newValue: any | undefined): void;
}>();

const valueProperty: WritableComputedRef<string | undefined> = computed({
  get() {
    const path = pathToString(props.absolutePath);
    let selectedOption = useSessionStore().currentSelectedOneOfOptions.get(path);
    return selectedOption?.displayText;
  },

  set(newValue) {
    const selectedOptionText: string | undefined = newValue;
    const path = pathToString(props.absolutePath);

    if (selectedOptionText) {
      const selectedOption = findOptionByDisplayText(selectedOptionText)!;
      useSessionStore().currentSelectedOneOfOptions.set(path, selectedOption);
      applySchemaConstantsOnDataBasedOnSelection(props.absolutePath, selectedOption);
      emit('update_tree');
    } else {
      useSessionStore().currentSelectedOneOfOptions.delete(path);
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

    let index = 0;
    for (let subSchema: JsonSchema of props.propertySchema.oneOf) {
      const valid = validationService.validateSubSchema(
        subSchema.jsonSchema!!,
        // TODO: remove key once it has become optional (change from Paul).
        pathToString(props.absolutePath) + '.oneOf[' + index + ']',
        props.propertyData
      ).valid;

      if (valid) {
        // found a oneOf subSchema for which the data is valid. Select it.
        const optionToSelect = findOptionBySubSchemaIndex(index);
        useSessionStore().currentSelectedOneOfOptions.set(pathAsString, optionToSelect!!);
        return;
      }

      index++;
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

function applySchemaConstantsOnDataBasedOnSelection(
  path: Path,
  selectedOneOfOption: OneOfAnyOfSelectionOption
) {
  // Based on the user selection, a schema is created by merging the base schema
  // of the property with the selected oneOf.
  // If the merged schema contains constants, those are applied to the data.
  // Note that it might seem logical to compute this merged schema only once
  // (e.g. when oneOf is selected), store it and re-use it later.
  // This, however, is not done because the effective merged schema could change
  // even without a new oneOf selection by the user, due to JSON schema features
  // such as if and else.

  const schemaAtPath = useSessionStore().effectiveSchemaAtPath(path).schema;
  const baseSchema = {...schemaAtPath.jsonSchema};
  delete baseSchema.oneOf;
  const mergedSchema = safeMergeSchemas(
    baseSchema,
    schemaAtPath.oneOf[selectedOneOfOption.index].jsonSchema
  );
  const resultData = applySchemaConstantsOnData(mergedSchema, props.propertyData);
  if (!_.isEqual(resultData, props.propertyData)) {
    emit('update_property_value', resultData);
  }
}
function applySchemaConstantsOnData(schema: JsonSchemaObjectType, data: any): any {
  // note that in pre-processing all const is converted to an enum with just one entry
  // hence, for us constants are equal to an enum of length 1.
  if (schema.enum) {
    if (schema.enum.length == 1) {
      data = schema.enum[0];
    }
  }
  if (schema.properties) {
    for (let key: string in schema.properties) {
      const propertySchema = schema.properties[key];
      applySchemaConstantsOnData(propertySchema, data[key]);
    }
  }
  return data;
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
