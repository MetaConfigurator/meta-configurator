<script setup lang="ts">
import type {Path} from '@/utility/path';
import {computed} from 'vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';

/* these are necessary styles for vue flow */
import '@vue-flow/core/dist/style.css';

/* this contains the default theme, these are optional styles */
import '@vue-flow/core/dist/theme-default.css';
import VueFlowPanel from '@/components/schema-diagram/VueFlowPanel.vue';

const props = defineProps<{}>();

const schemaSession = getSessionForMode(SessionMode.SchemaEditor);
const dataSession = getSessionForMode(SessionMode.DataEditor);

const currentSchema = computed(() => {
  const schema = dataSession.effectiveSchemaAtCurrentPath?.value.schema;
  if (!schema) {
    return new JsonSchemaWrapper({}, dataSession.mode, false);
  }
  return schema;
});

function zoomIntoPath(pathToAdd: Path) {
  schemaSession.updateCurrentPath(schemaSession.currentPath.value.concat(pathToAdd));
  schemaSession.updateCurrentSelectedElement(schemaSession.currentPath.value);
}

function selectPath(path: Path) {
  schemaSession.updateCurrentSelectedElement(path);
}
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <div class="flex-grow overflow-y-auto">
      <VueFlowPanel
        :currentPath="schemaSession.currentPath.value"
        @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
        @select_path="selectedPath => selectPath(selectedPath)" />
    </div>
  </div>
</template>

<style scoped></style>
