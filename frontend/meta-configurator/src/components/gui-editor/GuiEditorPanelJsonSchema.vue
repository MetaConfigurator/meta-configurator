<script setup lang="ts">
import SchemaInfoPanel from '@/components/gui-editor/SchemaInfoPanel.vue';
import CurrentPathBreadcrumb from '@/components/gui-editor/CurrentPathBreadcrump.vue';
import PropertiesPanel from '@/components/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/model/path';
import {useSessionStore} from '@/store/sessionStore';

const sessionStore = useSessionStore();

function updatePath(newPath: Path) {
  sessionStore.$patch({currentPath: newPath});
}

function updateData(path: Path, newValue: any) {
  sessionStore.updateDataAtPath(path, newValue);
}

function zoomIntoPath(pathToAdd: Path) {
  sessionStore.$patch(state => (state.currentPath = state.currentPath.concat(pathToAdd)));
}
</script>

<template>
  <div class="p-5 space-y-3 h-full">
    <SchemaInfoPanel :schema="sessionStore.fileSchema" />
    <CurrentPathBreadcrumb
      :root-name="sessionStore.fileSchema.title ?? 'root'"
      :path="sessionStore.currentPath"
      @update:path="newPath => updatePath(newPath)" />
    <PropertiesPanel
      :current-schema="sessionStore.schemaAtCurrentPath"
      :current-path="sessionStore.currentPath"
      :current-data="sessionStore.dataAtCurrentPath"
      @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
      @update_data="updateData" />
  </div>
</template>

<style scoped></style>
