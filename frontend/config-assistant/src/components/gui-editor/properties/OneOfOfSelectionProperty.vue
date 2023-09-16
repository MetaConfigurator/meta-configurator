<script setup lang="ts">
import {computed, defineProps} from 'vue';
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

const possibleValues = props.possibleSchemas.map(
  (subSchema, index) => new OneOfAnyOfSelectionOption(schemaOptionToString(subSchema, index), index)
);

const emit = defineEmits<{
  (e: 'update_tree'): void;
  (e: 'update_property_value', newValue: any | undefined): void;
}>();

const valueProperty = computed({
  get() {
    const path = pathToString(props.absolutePath);
    return useSessionStore().currentSelectedOneOfOptions.get(path);
  },

  set(newValue) {
    const selectedOption: OneOfAnyOfSelectionOption | undefined = newValue;
    const path = pathToString(props.absolutePath);

    if (selectedOption) {
      useSessionStore().currentSelectedOneOfOptions.set(path, selectedOption);
      applySchemaConstantsOnDataBasedOnSelection(props.absolutePath, selectedOption);
      emit('update_tree');
    } else {
      useSessionStore().currentSelectedOneOfOptions.delete(path);
      emit('update_tree');
    }
  },
});

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
