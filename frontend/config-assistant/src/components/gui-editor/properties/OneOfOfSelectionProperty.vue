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
      // TODO: store merged Schema in session store instead of recompute in TreeNodeResolver
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
  const schemaAtPath = useSessionStore().schemaAtPath(path);
  console.log(
    'apply schema constants ',
    path,
    selectedOneOfOption,
    schemaAtPath.jsonSchema,
    'oneOf ',
    schemaAtPath.oneOf[selectedOneOfOption.index]
  );
  const baseSchema = {...schemaAtPath.jsonSchema};
  delete baseSchema.oneOf;
  const mergedSchema = safeMergeSchemas(
    baseSchema,
    schemaAtPath.oneOf[selectedOneOfOption.index].jsonSchema
  );
  console.log('apply schema constants merged schema ', path, mergedSchema);
  const resultData = applySchemaConstantsOnData(mergedSchema, props.propertyData);
  if (!_.isEqual(resultData, props.propertyData)) {
    emit('update_property_value', resultData);
  }
}
function applySchemaConstantsOnData(schema: JsonSchemaObjectType, data: any): any {
  // note that in pre-processing all const is converted to an enum with just one entry
  if (schema.enum) {
    console.log('apply schema constants merged schema is enum', schema, {...data});
    if (schema.enum.length == 1) {
      data = schema.enum[0];
      console.log('change data', schema, data);
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
