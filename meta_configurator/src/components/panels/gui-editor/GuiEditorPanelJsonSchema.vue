<script setup lang="ts">
import CurrentPathBreadcrumb from '@/components/panels/shared-components/CurrentPathBreadcrump.vue';
import PropertiesPanel from '@/components/panels/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/utility/path';
import {computed} from 'vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import type {SessionMode} from '@/store/sessionMode';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);

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

const currentSchema = computed(() => {
  const schema = session.effectiveSchemaAtCurrentPath?.value.schema;
  if (!schema) {
    return new JsonSchemaWrapper({}, props.sessionMode, false);
  }
  return schema;
});
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <CurrentPathBreadcrumb
      :session-mode="props.sessionMode"
      :root-name="'document root'"
      :path="session.currentPath.value"
      @update:path="newPath => updatePath(newPath)" />
    <div class="flex-grow overflow-y-scroll">
      <PropertiesPanel
        :currentSchema="currentSchema"
        :currentPath="session.currentPath.value"
        :currentData="session.dataAtCurrentPath.value"
        :sessionMode="props.sessionMode"
        :table-header="undefined"
        @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
        @remove_property="removeProperty"
        @select_path="selectedPath => selectPath(selectedPath)"
        @update_data="updateData" />
    </div>
  </div>
</template>

<style scoped></style>
