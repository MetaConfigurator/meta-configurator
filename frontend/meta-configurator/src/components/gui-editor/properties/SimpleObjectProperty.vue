<script setup lang="ts">
import type {JsonSchema} from '@/model/JsonSchema';
import type {PathElement} from '@/model/path';

const props = defineProps<{
  propertyName: PathElement;
  propertySchema: JsonSchema;
  propertyData: Object | undefined;
}>();

function getNumberOfProperties(): number {
  return Math.max(
    Object.keys(props.propertyData).length,
    Object.keys(props.propertySchema.properties).length
  );
}
</script>
<template>
  <p class="pl-2 text-gray-400 font-extralight">{{ getNumberOfProperties() }} properties</p>
</template>

<style scoped></style>
