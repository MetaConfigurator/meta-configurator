<!-- This component is used to select a oneOf sub-schema for a property -->
<script setup lang="ts">
import type {WritableComputedRef} from 'vue';
import {computed, onMounted} from 'vue';
import Dropdown from 'primevue/dropdown';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {useSessionStore} from '@/store/sessionStore';
import type {Path, PathElement} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';
import {OneOfAnyOfSelectionOption, schemaOptionToString} from '@/store/oneOfAnyOfSelectionOption';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';
import {safeMergeSchemas} from '@/schema/mergeAllOfs';
import _ from 'lodash';
import {useValidationService} from '@/schema/validation/useValidation';
import {useUserSchemaSelectionStore} from '@/store/userSchemaSelectionStore';
import {useCurrentSchema} from '@/data/useDataLink';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchemaWrapper;
  propertyData: any | undefined;
  absolutePath: Path;
  possibleSchemas: Array<JsonSchemaWrapper>;
  isTypeUnion: boolean;
}>();

function getCurrentSelectedOptions(): Map<string, OneOfAnyOfSelectionOption> {
  if (props.isTypeUnion) {
    return useUserSchemaSelectionStore().currentSelectedTypeUnionOptions;
  } else {
    return useUserSchemaSelectionStore().currentSelectedOneOfOptions;
  }
}

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
    const optionFromStore = getCurrentSelectedOptions().get(path);
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
      getCurrentSelectedOptions().set(path, selectedOption);
      useSessionStore().expand(props.absolutePath);
      applySchemaConstantsOnDataBasedOnSelection(props.absolutePath, selectedOption);
    } else {
      getCurrentSelectedOptions().delete(path);
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
  const validationService = useValidationService();

  if (getCurrentSelectedOptions().has(pathAsString)) {
    return;
  }

  // User has not yet made a oneOf sub-schema selection for this path
  // --> auto infer a sub-schema
  let index = 0;
  const schemasToValidate = props.isTypeUnion ? props.possibleSchemas : props.propertySchema.oneOf;
  for (const subSchema of schemasToValidate) {
    const validationResult = validationService.validateSubSchema(
      subSchema.jsonSchema ?? {},
      props.propertyData
    );

    if (validationResult.valid) {
      // found a oneOf subSchema for which the data is valid. Select it.
      const optionToSelect = findOptionBySubSchemaIndex(index);
      getCurrentSelectedOptions().set(pathAsString, optionToSelect!!);
      return;
    }

    index++;
  }
}

function applySchemaConstantsOnDataBasedOnSelection(
  path: Path,
  selectedOneOfOption: OneOfAnyOfSelectionOption
) {
  if (props.isTypeUnion) {
    return; // not relevant for type unions
  }

  // Based on the user selection, a schema is created by merging the base schema
  // of the property with the selected oneOf.
  // If the merged schema contains constants, those are applied to the data.
  // Note that it might seem logical to compute this merged schema only once
  // (e.g. when oneOf is selected), store it and re-use it later.
  // This, however, is not done because the effective merged schema could change
  // even without a new oneOf selection by the user, due to JSON schema features
  // such as if and else.

  const schemaAtPath = useCurrentSchema().effectiveSchemaAtPath(path).schema;
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
