<script setup lang="ts">
import type {JsonSchema} from '@/model/JsonSchema';
import {dataToString} from '@/helpers/dataToString';

const props = defineProps<{
  propertyName: string;
  propertySchema: JsonSchema;
  propertyData: Array<any> | undefined;
}>();

function getNumberOfItems(): number {
  return props.propertyData?.length ?? 0;
}
</script>

<template>
  <div class="pl-3 flex flex-row items-center justify-between space-x-6 w-full pr-10">
    <span class="text-sm text-gray-400 truncate w-4/5">{{ dataToString(propertyData) }}</span>
    <span class="text-gray-500 font-extralight min-w-max"> {{ getNumberOfItems() }} items </span>
  </div>
</template>

<style scoped></style>
