<!--
Simple component that displays a preview of the array elements.
-->
<script setup lang="ts">
import type {JsonSchema} from '@/schema/jsonSchema';
import type {Path} from '@/model/path';
import {dataToString} from '@/utility/dataToString';

const props = defineProps<{
  propertyName: string;
  propertySchema: JsonSchema;
  propertyData: Array<any> | undefined;
  absolutePath: Path;
  expanded: boolean;
}>();

function getNumberOfItems(): number {
  return props.propertyData?.length ?? 0;
}
</script>

<template>
  <div class="pl-3 grid grid-cols-5 items-center justify-between gap-x-6 w-full">
    <span class="text-sm text-gray-400 truncate col-span-4" style="max-width: 15rem">
      <span v-if="!expanded">{{ dataToString(propertyData) }}</span>
    </span>
    <span class="text-gray-500 font-extralight justify-self-end" v-if="!expanded">
      {{ getNumberOfItems() }} items
    </span>
  </div>
</template>

<style scoped></style>
