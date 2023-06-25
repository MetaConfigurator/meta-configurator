<script setup lang="ts">
import type {JsonSchema} from '@/model/JsonSchema';

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
  <p class="text-gray-400 font-extralight pl-2">{{ getNumberOfItems() }} items</p>
</template>

<style scoped></style>
