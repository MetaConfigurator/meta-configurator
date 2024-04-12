<script setup lang="ts">
import SchemaInfoPanel from '@/components/gui-editor/SchemaInfoPanel.vue';
import CurrentPathBreadcrumb from '@/components/gui-editor/CurrentPathBreadcrump.vue';
import PropertiesPanel from '@/components/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/utility/path';
import {useSessionStore} from '@/store/sessionStore';
import {computed} from 'vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {useCurrentData, useCurrentSchema} from '@/data/useDataLink';

const sessionStore = useSessionStore();

function updatePath(newPath: Path) {
  sessionStore.currentPath = newPath;
}

function updateData(path: Path, newValue: any) {
  useCurrentData().setDataAt(path, newValue);
}

function removeProperty(path: Path) {
  useCurrentData().removeDataAt(path);
  sessionStore.currentSelectedElement = path;
}

function zoomIntoPath(pathToAdd: Path) {
  sessionStore.currentPath = sessionStore.currentPath.concat(pathToAdd);
  sessionStore.currentSelectedElement = sessionStore.currentPath;
}

function selectPath(path: Path) {
  sessionStore.currentSelectedElement = path;
}

const currentSchema = computed(() => {
  const schema = useSessionStore().effectiveSchemaAtCurrentPath?.schema;
  if (!schema) {
    return new JsonSchemaWrapper({}, useCurrentSchema().schemaPreprocessed.value, false);
  }
  return schema;
});
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <SchemaInfoPanel :mode="useSessionStore().currentMode" />
    <CurrentPathBreadcrumb
      :root-name="'document root'"
      :path="sessionStore.currentPath"
      @update:path="newPath => updatePath(newPath)" />
    <div class="flex-grow overflow-y-auto">
      <PropertiesPanel
        :currentSchema="currentSchema"
        :currentPath="sessionStore.currentPath"
        :currentData="useSessionStore().dataAtCurrentPath"
        @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
        @remove_property="removeProperty"
        @select_path="selectedPath => selectPath(selectedPath)"
        @update_data="updateData" />
    </div>
  </div>
</template>

<style scoped></style>
