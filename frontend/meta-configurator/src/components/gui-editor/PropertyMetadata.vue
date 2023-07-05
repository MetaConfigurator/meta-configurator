<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
import IconExpand from '@/components/icons/IconExpand.vue';
import type {ConfigTreeNodeData} from '@/model/ConfigTreeNode';
import type {Path} from '@/model/path';

const props = defineProps<{
  nodeData: ConfigTreeNodeData;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path_to_add: Path): void;
}>();

function isExpandable(): boolean {
  return props.nodeData.schema.hasType('object') || props.nodeData.schema.hasType('array');
}

function isRequired(): boolean {
  return props.nodeData.parentSchema?.isRequired(props.nodeData.name as string) || false;
}

function zoomIntoPath() {
  if (isExpandable()) {
    emit('zoom_into_path', props.nodeData.relativePath);
  }
}
</script>

<template>
  <span class="mr-2" :class="{'hover:underline': isExpandable()}" @dblclick="zoomIntoPath()">
    {{ nodeData.name }}<span class="text-red-600">{{ isRequired() ? '*' : '' }}</span>
  </span>

  <span class="text-xs text-gray-400">:&nbsp;{{ nodeData.schema.type.join(',') }}</span>

  <!-- "zoom in" icon -->
  <div class="flex flex-row w-full justify-end mr-5">
    <IconExpand
      class="text-gray-700 hover:scale-110 h-5"
      v-if="isExpandable()"
      @click="zoomIntoPath()" />
  </div>
</template>

<style scoped></style>
