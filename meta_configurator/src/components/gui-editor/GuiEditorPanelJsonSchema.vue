<script setup lang="ts">
import SchemaInfoPanel from '@/components/gui-editor/SchemaInfoPanel.vue';
import CurrentPathBreadcrumb from '@/components/gui-editor/CurrentPathBreadcrump.vue';
import PropertiesPanel from '@/components/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/model/path';
import {useSessionStore} from '@/store/sessionStore';
import {computed} from 'vue';
import {JsonSchema} from '@/schema/jsonSchema';
import {useCurrentDataLink} from '@/data/useDataLink';

const sessionStore = useSessionStore();

function updatePath(newPath: Path) {
  sessionStore.currentPath = newPath;
}

function updateData(path: Path, newValue: any) {
  useCurrentDataLink().setDataAt(path, newValue);
}

function removeProperty(path: Path) {
  useCurrentDataLink().removeDataAt(path);
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
  const schema = sessionStore.effectiveSchemaAtCurrentPath?.schema;
  if (!schema) {
    return new JsonSchema({});
  }
  return schema;
});
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <SchemaInfoPanel :schema="sessionStore.fileSchema" />
    <CurrentPathBreadcrumb
      :root-name="sessionStore.fileSchema?.title ?? 'root'"
      :path="sessionStore.currentPath"
      @update:path="newPath => updatePath(newPath)" />
    <div class="flex-grow overflow-y-auto">
      <PropertiesPanel
        :currentSchema="currentSchema"
        :currentPath="sessionStore.currentPath"
        :currentData="sessionStore.dataAtCurrentPath"
        @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
        @remove_property="removeProperty"
        @select_path="selectedPath => selectPath(selectedPath)"
        @update_data="updateData" />
    </div>
  </div>
</template>

<style scoped></style>
