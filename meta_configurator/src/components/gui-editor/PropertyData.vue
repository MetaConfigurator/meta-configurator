<!--
Wrapper component that contains the actual component that allows the user to edit the value of a property.
The component is chosen based on the type of the property, see resolveCorrespondingComponent.
-->
<script setup lang="ts">
import type {ConfigTreeNodeData} from '@/components/gui-editor/configDataTreeNode';
import type {Path} from '@/utility/path';
import {resolveCorrespondingComponent} from '@/components/gui-editor/resolveCorrespondingComponent';
import {pathToString} from '@/utility/pathUtils';
import Button from 'primevue/button';
import {getDataForMode} from '@/data/useDataLink';
import type {SessionMode} from '@/store/sessionMode';
import {isRequiredProperty} from '@/components/gui-editor/configTreeNodeReadingUtils';

const props = defineProps<{
  nodeData: ConfigTreeNodeData;
  sessionMode: SessionMode;
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

function shouldShowRemove(): boolean {
  return (
    !isRequiredProperty(props.nodeData) &&
    getDataForMode(props.sessionMode).dataAt(props.nodeData.absolutePath) !== undefined &&
    !props.nodeData.schema.readOnly
  );
}
</script>

<template>
  <div class="grid-cols-5 content-center justify-between">
    <Component
      :id="pathToString(nodeData.absolutePath)"
      :sessionMode="props.sessionMode"
      class="truncate col-span-4"
      style="width: 90%; max-width: 90%"
      :is="resolveCorrespondingComponent(nodeData, props.sessionMode)"
      @update:propertyData="(newValue: any) => propagateUpdateValueEvent(newValue)"
      @update:tree="() => propagateUpdateTreeEvent()" />

    <!-- x button to remove the property -->
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
