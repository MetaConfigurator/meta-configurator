<!--
Simple property component that displays a preview of the object properties.
-->
<script setup lang="ts">
import type {JsonSchema} from '@/schema/jsonSchema';
import type {Path, PathElement} from '@/model/path';
import {dataToString} from '@/utility/dataToString';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchema;
  propertyData: Object | undefined;
  absolutePath: Path;
  expanded: boolean;
}>();

function getNumberOfProperties(): number {
  return Math.max(
    Object.keys(props.propertyData ?? {}).length,
    Object.keys(props.propertySchema.properties).length
  );
}
</script>
<template>
  <div class="pl-3 grid grid-cols-5 items-center justify-between gap-x-6">
    <div
      class="text-sm text-gray-400 truncate col-span-3 overflow-hidden inline-block"
      style="max-width: 15rem"
      v-if="!expanded">
      {{ dataToString(props.propertyData) }}
    </div>
    <span class="text-gray-500 font-extralight justify-self-end" v-if="!expanded">
      {{ getNumberOfProperties() }} properties
    </span>
  </div>
</template>

<style scoped></style>
