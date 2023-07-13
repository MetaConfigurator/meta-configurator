<script setup lang="ts">
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {PathElement} from '@/model/path';
import {dataToString} from '@/helpers/data/dataToString';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchema;
  propertyData: Object | undefined;
}>();

function getNumberOfProperties(): number {
  return Math.max(
    Object.keys(props.propertyData ?? {}).length,
    Object.keys(props.propertySchema.properties).length
  );
}
</script>
<template>
  <div class="pl-3 grid grid-cols-5 items-center justify-between gap-x-6 w-full pr-5">
    <span class="text-sm text-gray-400 truncate col-span-4" style="max-width: 90%">{{
      dataToString(propertyData)
    }}</span>
    <span class="text-gray-500 font-extralight justify-self-end">
      {{ getNumberOfProperties() }} properties
    </span>
  </div>
</template>

<style scoped></style>
