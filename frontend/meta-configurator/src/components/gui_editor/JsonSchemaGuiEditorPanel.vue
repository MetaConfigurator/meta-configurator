<script setup lang="ts">
import {schemaStore} from '@/stores/schemaStore';
import SchemaInfoPanel from '@/components/gui_editor/SchemaInfoPanel.vue';
import SchemaBreadcrumb from '@/components/gui_editor/SchemaBreadcrumb.vue';
import {dataStore} from '@/stores/dataStore';
import PropertiesPanel from '@/components/gui_editor/PropertiesPanel.vue';

const schemaStoreInstance = schemaStore();

const dataStoreInstance = dataStore();

function updatePath(newPath: string[]) {
  dataStoreInstance.$patch({currentPath: newPath});
}

function updateData(path: (string | number)[], newValue: any) {
  dataStoreInstance.updateDataAtPath(path, newValue);
}

function expandPath(pathToAdd: Array<string | number>) {
  dataStoreInstance.$patch(state => (state.currentPath = state.currentPath.concat(pathToAdd)));
}
</script>

<template>
  <div class="p-5 space-y-3 h-full">
    <SchemaInfoPanel :schema="schemaStoreInstance.schema" />
    <SchemaBreadcrumb
      :root-name="schemaStoreInstance.schema.title ?? 'root'"
      :path="dataStoreInstance.currentPath"
      @update:path="newPath => updatePath(newPath)" />
    <PropertiesPanel
      :current-schema="schemaStoreInstance.schemaAtCurrentPath"
      :current-path="dataStoreInstance.currentPath"
      :current-data="dataStoreInstance.dataAtCurrentPath"
      @expand_current_path="pathToAdd => expandPath(pathToAdd)"
      @update_data="updateData" />
  </div>
</template>

<style scoped></style>
