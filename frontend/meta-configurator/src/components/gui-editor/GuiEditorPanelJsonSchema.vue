<script setup lang="ts">
import SchemaInfoPanel from '@/components/gui-editor/SchemaInfoPanel.vue';
import CurrentPathBreadcrumb from '@/components/gui-editor/CurrentPathBreadcrump.vue';
import {useDataStore} from '@/store/dataStore';
import PropertiesPanel from '@/components/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/model/path';
import {useSchemaStore} from '@/store/schemaStore';
import {useCommonStore} from '@/store/commonStore';

const schemaStore = useSchemaStore();
const dataStore = useDataStore();
const commonStore = useCommonStore();

function updatePath(newPath: Path) {
  commonStore.$patch({currentPath: newPath});
}

function updateData(path: Path, newValue: any) {
  dataStore.updateDataAtPath(path, newValue);
}

function zoomIntoPath(pathToAdd: Path) {
  commonStore.$patch(state => (state.currentPath = state.currentPath.concat(pathToAdd)));
}
</script>

<template>
  <div class="p-5 space-y-3 h-full">
    <SchemaInfoPanel :schema="schemaStore.schema" />
    <CurrentPathBreadcrumb
      :root-name="schemaStore.schema.title ?? 'root'"
      :path="commonStore.currentPath"
      @update:path="newPath => updatePath(newPath)" />
    <PropertiesPanel
      :current-schema="schemaStore.schemaAtCurrentPath"
      :current-path="commonStore.currentPath"
      :current-data="dataStore.dataAtCurrentPath"
      @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
      @update_data="updateData" />
  </div>
</template>

<style scoped></style>
