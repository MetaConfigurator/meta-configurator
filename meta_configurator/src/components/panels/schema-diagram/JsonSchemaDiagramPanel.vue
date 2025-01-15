<script setup lang="ts">
import type {Path} from '@/utility/path';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';

/* these are necessary styles for vue flow */
import '@vue-flow/core/dist/style.css';

/* this contains the default theme, these are optional styles */
import '@vue-flow/core/dist/theme-default.css';
import VueFlowPanel from '@/components/panels/schema-diagram/VueFlowPanel.vue';

const schemaSession = getSessionForMode(SessionMode.SchemaEditor);
const schemaData = getDataForMode(SessionMode.SchemaEditor);

function zoomIntoPath(pathAbsolute: Path) {
  schemaSession.updateCurrentPath(pathAbsolute);
  schemaSession.updateCurrentSelectedElement(pathAbsolute);
}

function selectElement(pathAbsolute: Path) {
  schemaSession.updateCurrentSelectedElement(pathAbsolute);
}

function updateData(path: Path, newValue: any) {
  schemaData.setDataAt(path, newValue);
}
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <div class="flex-grow overflow-y-auto">
      <VueFlowPanel
        @update_current_path="path => zoomIntoPath(path)"
        @select_element="path => selectElement(path)"
        @update_data="(path, newValue) => updateData(path, newValue)" />
    </div>
  </div>
</template>

<style scoped></style>
