<script setup lang="ts">
import SchemaInfoPanel from '@/components/gui-editor/SchemaInfoPanel.vue';
import CurrentPathBreadcrumb from '@/components/gui-editor/CurrentPathBreadcrump.vue';
import PropertiesPanel from '@/components/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/model/path';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {onMounted, watch} from 'vue';
import {storeToRefs} from 'pinia';

const sessionStore = useSessionStore();
const {currentSelectedElement} = storeToRefs(sessionStore);

onMounted(() => {
  watch(
    currentSelectedElement,
    newVal => {
      // new element has been selected
      // TODO: automatically expand objects/arrays contained in path
    },
    {deep: true}
  );
});

function updatePath(newPath: Path) {
  sessionStore.lastChangeResponsible = ChangeResponsible.GuiEditor;
  sessionStore.currentPath = newPath;
}

function updateData(path: Path, newValue: any) {
  sessionStore.lastChangeResponsible = ChangeResponsible.GuiEditor;
  sessionStore.updateDataAtPath(path, newValue);
  sessionStore.lastChangeResponsible = ChangeResponsible.GuiEditor;
  sessionStore.currentSelectedElement = path;
}

function zoomIntoPath(pathToAdd: Path) {
  sessionStore.lastChangeResponsible = ChangeResponsible.GuiEditor;
  sessionStore.currentPath = sessionStore.currentPath.concat(pathToAdd);
}
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <SchemaInfoPanel :schema="sessionStore.fileSchema" />
    <CurrentPathBreadcrumb
      :root-name="sessionStore.fileSchema.title ?? 'root'"
      :path="sessionStore.currentPath"
      @update:path="newPath => updatePath(newPath)" />
    <PropertiesPanel
      class="flex-grow overflow-y-auto"
      :current-schema="sessionStore.schemaAtCurrentPath"
      :current-path="sessionStore.currentPath"
      :current-data="sessionStore.dataAtCurrentPath"
      @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
      @update_data="updateData" />
  </div>
</template>

<style scoped></style>
