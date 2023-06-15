<script setup lang="ts">
import { schemaStore } from "@/stores/schemaStore";
import SchemaInfoPanel from "@/components/gui-editor/SchemaInfoPanel.vue";
import SchemaBreadcrumb from "@/components/gui-editor/SchemaBreadcrumb.vue";
import PropertiesEditorTable from "@/components/gui-editor/PropertiesEditorTable.vue";
import { dataStore } from "@/stores/dataStore";
import PropertiesPanel from "@/components/gui-editor/PropertiesPanel.vue";

const schemaStoreInstance = schemaStore();

const dataStoreInstance = dataStore();

function updatePath(newPath: string[]) {
  dataStoreInstance.$patch({currentPath: newPath});
}

function expandPath(pathToAdd: string | number) {
  dataStoreInstance.$patch(state => state.currentPath.push(pathToAdd));
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
      :current-data="dataStoreInstance.dataAtCurrentPath"
      @expand:path="pathToAdd => expandPath(pathToAdd)" />
  </div>
</template>

<style scoped></style>
