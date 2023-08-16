<script setup lang="ts">
import type {ConfigTreeNodeData} from '@/model/ConfigDataTreeNode';
import type {Path} from '@/model/path';
import {resolveCorrespondingComponent} from '@/components/gui-editor/resolveCorrespondingComponent';
import {pathToString} from '@/helpers/pathHelper';

const props = defineProps<{
  nodeData: ConfigTreeNodeData;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', path: Path, newValue: string): void;
  (e: 'update_tree'): void;
}>();

function propagateUpdateValueEvent(newValue: any) {
  emit('update_property_value', props.nodeData.relativePath, newValue);
}
function propagateUpdateTreeEvent() {
  emit('update_tree');
}
</script>

<template>
  <Component
    :id="pathToString(nodeData.absolutePath)"
    class="truncate"
    :is="resolveCorrespondingComponent(nodeData)"
    @update_property_value="(newValue: any) => propagateUpdateValueEvent(newValue)"
    @update_tree="propagateUpdateTreeEvent()" />
</template>

<style scoped></style>
