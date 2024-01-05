<!--
Simple component that displays a preview of the array elements.
-->
<script setup lang="ts">
import {dataToString} from '@/utility/dataToString';
import {computed} from 'vue';

const props = defineProps<{
  propertyData: Array<any> | undefined;
  expanded: boolean;
}>();

const numberOfItems = computed(() => {
  return props.propertyData?.length ?? 0;
});

const isArrayOrUndefined = computed(() => {
  return props.propertyData == undefined || Array.isArray(props.propertyData);
});
</script>

<template>
  <div class="pl-3 grid grid-cols-5 items-center justify-between gap-x-6 w-full">
    <span class="text-sm text-gray-400 truncate col-span-4" style="max-width: 15rem">
      <span v-if="!expanded" data-test="object-description">{{ dataToString(propertyData) }}</span>
    </span>
    <span
      class="text-gray-500 font-extralight justify-self-end"
      v-if="!expanded && isArrayOrUndefined"
      data-test="object-count">
      {{ numberOfItems }} {{ numberOfItems === 1 ? 'item' : 'items' }}
    </span>
  </div>
</template>

<style scoped></style>
