<script setup lang="ts">
import type {ConfigTreeNodeData} from '@/model/ConfigDataTreeNode';
import type {Path} from '@/model/path';
import {resolveCorrespondingComponent} from '@/components/gui-editor/resolveCorrespondingComponent';
import {pathToString} from '@/helpers/pathHelper';
import Button from 'primevue/button';
import {useSessionStore} from '@/store/sessionStore';

const props = defineProps<{
  nodeData: ConfigTreeNodeData;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', path: Path, newValue: any): void;
  (e: 'remove_property', path: Path): void;
  (e: 'update_tree'): void;
}>();

function propagateUpdateValueEvent(newValue: any) {
  emit('update_property_value', props.nodeData.relativePath, newValue);
}
function propagateUpdateTreeEvent() {
  emit('update_tree');
}

function removeProperty() {
  emit('remove_property', props.nodeData.relativePath);
}

function isRequired(): boolean {
  return props.nodeData.parentSchema?.isRequired(props.nodeData.name as string) || false;
}

function shouldShowRemove(): boolean {
  return !isRequired() && useSessionStore().dataAtPath(props.nodeData.absolutePath) !== undefined;
}
</script>

<template>
  <div class="grid-cols-5 content-center justify-between">
    <Component
      :id="pathToString(nodeData.absolutePath)"
      class="truncate col-span-4"
      style="width: 90%; max-width: 90%"
      :is="resolveCorrespondingComponent(nodeData)"
      @update_property_value="(newValue: any) => propagateUpdateValueEvent(newValue)"
      @update_tree="propagateUpdateTreeEvent()" />
    <Button
      class="h-full"
      style="width: 10%"
      v-if="shouldShowRemove()"
      icon="pi pi-times"
      severity="secondary"
      text
      aria-label="Remove"
      @click="removeProperty" />
  </div>
</template>

<style scoped>
div {
  display: flex;
  justify-content: space-between;
  vertical-align: middle;
  height: 30px;
}
</style>
