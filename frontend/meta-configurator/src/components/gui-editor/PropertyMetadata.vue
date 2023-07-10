<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
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

function isDeprecated(): boolean {
  return props.nodeData.schema.deprecated;
}

function zoomIntoPath() {
  if (isExpandable()) {
    emit('zoom_into_path', props.nodeData.relativePath);
  }
}
</script>

<template>
  <span class="flex flex-row w-full items-center">
    <!--If expandable: show underline on hovering. Call zoom function when double click. -->
    <span
      class="mr-2"
      :class="{'hover:underline': isExpandable()}"
      @click="zoomIntoPath()"
      v-tooltip="nodeData.schema.description">
      <!--If deprecated: put name into a s tag (strikethrough) -->
      <s v-if="isDeprecated()">{{ nodeData.name }}</s>
      <!--Otherwise: just normal text -->
      <span v-else>{{ nodeData.name }}</span>
      <!--Show red star after text if property is required -->
      <span class="text-red-600">{{ isRequired() ? '*' : '' }}</span>
    </span>

    <span class="text-xs text-gray-400">:&nbsp;{{ nodeData.schema.type.join(',') }}</span>

  </span>
</template>

<style scoped></style>
