<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
import IconExpand from '@/components/icons/IconExpand.vue';
import type {SchemaTreeNode} from '@/schema/SchemaTreeNodeResolver';

const props = defineProps<{
  metadata: SchemaTreeNode;
}>();

defineEmits<{
  (e: 'expand_current_path', path_to_add: Array<string | number>): void;
}>();

function isExpandable(): boolean {
  return props.metadata.schema.hasType('object');
}
</script>
<template>
  <span class="mr-2">{{ metadata.name }}</span>

  <span class="text-xs text-gray-400">:&nbsp;{{ metadata.schema.type.join(',') }}</span>

  <!-- "zoom in" icon -->
  <div class="flex flex-row w-full justify-end mr-5">
    <IconExpand
      class="text-gray-700 hover:scale-110 h-5"
      v-if="isExpandable()"
      @click="$emit('expand_current_path', metadata.relativePath)" />
  </div>
</template>

<style scoped></style>
