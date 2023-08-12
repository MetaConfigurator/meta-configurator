<script setup lang="ts">
import {computed, defineProps, defineEmits} from 'vue';
import Dropdown from 'primevue/dropdown';
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import {useSessionStore} from '@/store/sessionStore';
import {Path} from '@/model/path';
import {pathToString} from '@/helpers/pathHelper';
import {toInteger} from 'lodash';

const props = defineProps<{
  propertyName: string;
  propertySchema: JsonSchema;
  propertyData: any | undefined;
  absolutePath: Path;
}>();

//const possibleValues = [1, 2, 0]// props.schema.oneOf.map(subSchema => subSchema)
const possibleValues = Array.from(Array(props.propertySchema.oneOf.length).keys());

const emit = defineEmits<{
  (e: 'update_property_value', newValue: any): void;
}>();

const valueProperty = computed({
  get() {
    const path = pathToString(props.absolutePath);
    return useSessionStore().currentSelectedOneOfOptions.get(path) | 0;
  },
  set(newValue) {
    console.log('selected ', newValue);
    const path = pathToString(props.absolutePath);
    console.log('update current selected oneOfOptions for path ', path, ' and index  ', newValue);
    useSessionStore().currentSelectedOneOfOptions.set(path, toInteger(newValue));
    useSessionStore().currentSelectedOneOfOptions = useSessionStore().currentSelectedOneOfOptions;
  },
});
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
}
</style>
