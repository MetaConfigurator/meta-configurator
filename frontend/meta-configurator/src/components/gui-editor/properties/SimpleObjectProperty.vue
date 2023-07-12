<script setup lang="ts">
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {PathElement} from '@/model/path';
import {dataToString} from '@/helpers/dataToString';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchema;
  propertyData: Object | undefined;
}>();

function getNumberOfProperties(): number {
  console.log('propertydata is ', props.propertyData, ' of ', props.propertyName);
  return Math.max(
    Object.keys(props.propertyData ?? {}).length,
    Object.keys(props.propertySchema.properties).length
  );
}
</script>
<template>
  <div class="pl-3 flex flex-row items-center justify-between space-x-6 w-full pr-10">
    <span class="text-sm text-gray-400 truncate w-4/5">{{ dataToString(propertyData) }}</span>
    <span class="text-gray-500 font-extralight min-w-max">
      {{ getNumberOfProperties() }} properties
    </span>
  </div>
</template>

<style scoped></style>
