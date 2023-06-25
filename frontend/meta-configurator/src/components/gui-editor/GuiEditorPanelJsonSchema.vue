<script setup lang="ts">
import SchemaInfoPanel from '@/components/gui-editor/SchemaInfoPanel.vue';
import CurrentPathBreadcrumb from '@/components/gui-editor/CurrentPathBreadcrump.vue';
import PropertiesPanel from '@/components/gui-editor/PropertiesPanel.vue';
import {generalStore} from '@/store/generalStore';

const generalStoreInstance = generalStore();

function updatePath(newPath: (string | number)[]) {
  generalStoreInstance.$patch({currentPath: newPath});
}

function updateData(path: (string | number)[], newValue: any) {
  generalStoreInstance.updateDataAtPath(path, newValue);
}

function zoomIntoPath(pathToAdd: Array<string | number>) {
  generalStoreInstance.$patch(state => (state.currentPath = state.currentPath.concat(pathToAdd)));
}
</script>

<template>
  <div class="p-5 space-y-3 h-full">
    <SchemaInfoPanel :schema="generalStoreInstance.schemaToDisplay" />
    <CurrentPathBreadcrumb
      :root-name="generalStoreInstance.schemaToDisplay.title ?? 'root'"
      :path="generalStoreInstance.currentPath"
      @update:path="newPath => updatePath(newPath)" />
    <PropertiesPanel
      :current-schema="generalStoreInstance.schemaAtCurrentPath"
      :current-path="generalStoreInstance.currentPath"
      :current-data="generalStoreInstance.dataToDisplay"
      @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
      @update_data="updateData" />
  </div>
</template>

<style scoped></style>
