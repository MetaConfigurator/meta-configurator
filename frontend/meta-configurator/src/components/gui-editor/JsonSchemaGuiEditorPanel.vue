<script setup lang="ts">
import { schemaStore } from "@/stores/schemaStore";
import SchemaInfoPanel from "@/components/gui-editor/SchemaInfoPanel.vue";
import SchemaBreadcrumb from "@/components/gui-editor/SchemaBreadcrumb.vue";
import { dataStore } from "@/stores/dataStore";
import PropertiesPanel from "@/components/gui-editor/PropertiesPanel.vue";

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
  <div class="border-x-2 border-gray-600 p-5 space-y-3">
    <SchemaInfoPanel :schema="schemaStoreInstance.schema" />
    <SchemaBreadcrumb
      :root-name="schemaStoreInstance.schema.title"
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
