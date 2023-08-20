<script setup lang="ts">
import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import type {PathElement} from '@/model/path';
import {Path} from '@/model/path';
import {dataToString} from '@/helpers/dataToString';
import {useSessionStore} from '@/store/sessionStore';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchema;
  propertyData: Object | undefined;
  absolutePath: Path;
}>();

function getNumberOfProperties(): number {
  return Math.max(
    Object.keys(props.propertyData ?? {}).length,
    Object.keys(props.propertySchema.properties).length
  );
}

function isExpanded(): boolean {
  return useSessionStore().isExpanded(props.absolutePath);
}
</script>
<template>
  <div class="pl-3 grid grid-cols-5 items-center justify-between gap-x-6">
    <div
      class="text-sm text-gray-400 truncate col-span-3 overflow-hidden inline-block"
      style="max-width: 15rem"
      v-if="!isExpanded()">
      {{ dataToString(props.propertyData) }}
    </div>
    <span class="text-gray-500 font-extralight justify-self-end">
      {{ getNumberOfProperties() }} properties
    </span>
  </div>
</template>

<style scoped></style>
