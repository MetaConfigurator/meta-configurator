<!--
Simple property component that displays a preview of the object properties.
-->
<script setup lang="ts">
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {dataToString} from '@/utility/dataToString';
import {computed} from 'vue';

const props = defineProps<{
  propertySchema: JsonSchemaWrapper;
  propertyData: Object | undefined;
  expanded: boolean;
}>();

const numberOfProperties = computed(() =>
  Math.max(
    Object.keys(props.propertyData ?? {}).length,
    Object.keys(props.propertySchema.properties).length
  )
);
</script>
<template>
  <div class="pl-3 grid grid-cols-5 items-center justify-between gap-x-6">
    <div
      class="text-sm text-gray-400 truncate col-span-3 overflow-hidden inline-block"
      style="max-width: 15rem"
      v-if="!expanded"
      data-test="object-description">
      {{ dataToString(props.propertyData) }}
    </div>
    <span
      class="text-gray-500 font-extralight justify-self-end"
      v-if="!expanded"
      data-test="object-count">
      {{ numberOfProperties }} {{ numberOfProperties === 1 ? 'property' : 'properties' }}
    </span>
  </div>
</template>

<style scoped></style>
