<!-- This component is used to select a oneOf sub-schema for a property -->
<script setup lang="ts">
import type {WritableComputedRef} from 'vue';
import {computed, onMounted} from 'vue';
import Dropdown from 'primevue/dropdown';
import type {JsonSchema} from '@/schema/jsonSchema';
import {useSessionStore} from '@/store/sessionStore';
import type {Path, PathElement} from '@/model/path';
import {pathToString} from '@/utility/pathUtils';
import {OneOfAnyOfSelectionOption, schemaOptionToString} from '@/model/oneOfAnyOfSelectionOption';
import type {JsonSchemaType} from '@/model/jsonSchemaType';
import {safeMergeSchemas} from '@/schema/mergeAllOfs';
import _ from 'lodash';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchema;
  propertyData: any | undefined;
  absolutePath: Path;
  possibleSchemas: Array<JsonSchema>;
}>();

const emit = defineEmits<{
  (e: 'update:tree'): void;
  (e: 'update:propertyData', newValue: any | undefined): void;
}>();

onMounted(() => {
  if (valueProperty.value === undefined && props.propertyData !== undefined) {
    inferOneOfUserSelection();
    emit('update:tree');
  }
});

const possibleOptions = props.possibleSchemas.map(
  (subSchema, index) => new OneOfAnyOfSelectionOption(schemaOptionToString(subSchema, index), index)
);

const valueProperty: WritableComputedRef<OneOfAnyOfSelectionOption | undefined> = computed({
  get(): OneOfAnyOfSelectionOption | undefined {
    const path = pathToString(props.absolutePath);
    const optionFromStore = useSessionStore().currentSelectedOneOfOptions.get(path);
    if (!optionFromStore) {
      return undefined;
    }
    // use the instance from the possible options array
    // otherwise the dropdown will not show the selected option
    // as it compares by reference
    return findOptionBySubSchemaIndex(optionFromStore.index);
  },
  set(selectedOption: OneOfAnyOfSelectionOption | undefined) {
    const path = pathToString(props.absolutePath);

    if (selectedOption) {
      useSessionStore().currentSelectedOneOfOptions.set(path, selectedOption);
      applySchemaConstantsOnDataBasedOnSelection(props.absolutePath, selectedOption);
    } else {
      useSessionStore().currentSelectedOneOfOptions.delete(path);
    }

    emit('update:tree');
  },
});

function findOptionBySubSchemaIndex(index: number): OneOfAnyOfSelectionOption | undefined {
  for (let option of possibleOptions) {
    if (option.index === index) {
      return option;
    }
  }
  return undefined;
}

// TODO consider extracting the following methods to external helper class

function inferOneOfUserSelection() {
  const pathAsString = pathToString(props.absolutePath);
  const validationService = useSessionStore().validationService;

  if (useSessionStore().currentSelectedOneOfOptions.has(pathAsString)) {
    return;
  }

  // User has not yet made a oneOf sub-schema selection for this path
  // --> auto infer a sub-schema
  let index = 0;
  for (const subSchema of props.propertySchema.oneOf) {
    const validationResult = validationService.validateSubSchema(
      subSchema.jsonSchema,
      props.propertyData
    );

    if (validationResult.valid) {
      // found a oneOf subSchema for which the data is valid. Select it.
      const optionToSelect = findOptionBySubSchemaIndex(index);
      useSessionStore().currentSelectedOneOfOptions.set(pathAsString, optionToSelect!!);
      return;
    }

    index++;
  }
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
    schemaAtPath.oneOf[selectedOneOfOption.index]?.jsonSchema ?? {}
  );
  const resultData = applySchemaConstantsOnData(mergedSchema, props.propertyData);
  if (!_.isEqual(resultData, props.propertyData)) {
    emit('update:propertyData', resultData);
  }
}
function applySchemaConstantsOnData(schema: JsonSchemaType, data: any): any {
  if (typeof schema !== 'object') {
    return data;
  }
  if (typeof data !== 'object') {
    return data;
  }

  // note that in pre-processing all const is converted to an enum with just one entry
  // hence, for us constants are equal to an enum of length 1.
  if (schema.enum) {
    if (schema.enum.length == 1) {
      data = schema.enum[0];
    }
  }
  if (schema.properties) {
    for (const key in schema.properties) {
      const propertySchema = schema.properties[key];
      if (data === undefined) {
        data = {};
      }
      if (key in data) {
        applySchemaConstantsOnData(propertySchema, data[key]);
      }
    }
  }
  return data;
}
</script>

<template>
  <div>
    <Dropdown
      class="tableInput w-full"
      v-model="valueProperty"
      :options="possibleOptions"
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
.tableInput {
  border: none;
  box-shadow: none;
}
::placeholder {
  color: #a8a8a8;
}
</style>
