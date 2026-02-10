<script setup lang="ts">
import CurrentPathBreadcrumb from '@/components/panels/shared-components/CurrentPathBreadcrump.vue';
import PropertiesPanel from '@/components/panels/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/utility/path';
import {computed} from 'vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {defaultJsonLdSchema} from '@/components/panels/rdf/rdfUtils';

const props = defineProps<{
  sessionMode: SessionMode;
  dataIsUnparsable: boolean;
  dataIsInJsonLd: boolean;
}>();

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);

const currentSchema = computed(() => {
  return new JsonSchemaWrapper(JSON.parse(defaultJsonLdSchema), props.sessionMode, true);
});

function updatePath(newPath: Path) {
  session.updateCurrentPath(newPath);
}

function updateData(path: Path, newValue: any) {
  data.setDataAt(path, newValue);
}

function removeProperty(path: Path) {
  data.removeDataAt(path);
  session.updateCurrentSelectedElement(path);
}

function zoomIntoPath(pathToAdd: Path) {
  session.updateCurrentPath(session.currentPath.value.concat(pathToAdd));
  session.updateCurrentSelectedElement(session.currentPath.value);
}

function selectPath(path: Path) {
  session.updateCurrentSelectedElement(path);
}

const currentData = computed(() => {
  return getDataForMode(props.sessionMode).dataAt(['@context']);
});
</script>

<template>
  <div
    :class="[
      'p-5 space-y-3 flex flex-col',
      {'disabled-wrapper': !dataIsInJsonLd || dataIsUnparsable},
    ]">
    <div v-if="dataIsInJsonLd && !dataIsUnparsable">
      <CurrentPathBreadcrumb
        :session-mode="props.sessionMode"
        :root-name="'document root'"
        :path="session.currentPath.value"
        @update:path="newPath => updatePath(newPath)" />
      <div class="flex-grow overflow-y-scroll">
        <PropertiesPanel
          :currentSchema="currentSchema"
          :currentPath="['@context']"
          :currentData="currentData"
          :sessionMode="props.sessionMode"
          :table-header="undefined"
          @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
          @remove_property="removeProperty"
          @select_path="selectedPath => selectPath(selectedPath)"
          @update_data="updateData" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.disabled-wrapper {
  position: relative;
}

.disabled-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  pointer-events: auto;
}

.disabled-wrapper > * {
  pointer-events: none;
  opacity: 0.5;
}
</style>
