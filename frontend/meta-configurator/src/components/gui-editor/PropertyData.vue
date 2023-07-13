<script setup lang="ts">
import type {ConfigTreeNodeData} from '@/model/ConfigDataTreeNode';
import type {Path} from '@/model/path';
import {resolveCorrespondingComponent} from '@/components/gui-editor/resolveCorrespondingComponent';

const props = defineProps<{
  nodeData: ConfigTreeNodeData;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', path: Path, newValue: string): void;
}>();

function propagateUpdateEvent(newValue: any) {
  emit('update_property_value', props.nodeData.relativePath, newValue);
}
</script>

<template>
  <Component
    :id="nodeData.relativePath.join('.')"
    class="truncate"
    :is="resolveCorrespondingComponent(props.nodeData)"
    @update_property_value="(newValue: any) => propagateUpdateEvent(newValue)" />
</template>

<style scoped></style>
