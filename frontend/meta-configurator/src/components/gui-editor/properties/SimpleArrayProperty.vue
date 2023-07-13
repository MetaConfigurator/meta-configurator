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
  <div class="pl-3 grid grid-cols-5 items-center justify-between gap-x-6 w-full pr-5">
    <span class="text-sm text-gray-400 truncate col-span-4" style="max-width: 90%">{{
      dataToString(propertyData)
    }}</span>
    <span class="text-gray-500 font-extralight justify-self-end">
      {{ getNumberOfItems() }} items
    </span>
  </div>
</template>

<style scoped></style>
