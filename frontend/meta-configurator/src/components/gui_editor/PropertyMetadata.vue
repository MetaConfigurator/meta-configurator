<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
import IconExpand from '@/components/icons/IconExpand.vue';
import type {SchemaTreeNodeData} from '@/schema/model/SchemaTreeNode';

const props = defineProps<{
  metadata: SchemaTreeNodeData;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path_to_add: Array<string | number>): void;
}>();

function isExpandable(): boolean {
  return props.metadata.schema.hasType('object') || props.metadata.schema.hasType('array');
}

function zoomIntoPath() {
  if (isExpandable()) {
    emit('zoom_into_path', props.metadata.relativePath);
  }
}
</script>
<template>
  <span class="mr-2" :class="{'hover:underline': isExpandable()}" @dblclick="zoomIntoPath()">
    {{ metadata.name }}
  </span>

  <span class="text-xs text-gray-400">:&nbsp;{{ metadata.schema.type.join(',') }}</span>

  <!-- "zoom in" icon -->
  <div class="flex flex-row w-full justify-end mr-5">
    <IconExpand
      class="text-gray-700 hover:scale-110 h-5"
      v-if="isExpandable()"
      @click="zoomIntoPath()" />
  </div>
</template>

<style scoped></style>
