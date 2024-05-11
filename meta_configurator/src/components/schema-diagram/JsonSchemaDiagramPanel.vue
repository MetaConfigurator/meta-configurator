<script setup lang="ts">
import type {Path} from '@/utility/path';
import {computed} from 'vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import type {SessionMode} from '@/store/sessionMode';

/* these are necessary styles for vue flow */
import '@vue-flow/core/dist/style.css';

/* this contains the default theme, these are optional styles */
import '@vue-flow/core/dist/theme-default.css';
import VueFlowPanel from '@/components/schema-diagram/VueFlowPanel.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);

const currentSchema = computed(() => {
  const schema = session.effectiveSchemaAtCurrentPath?.value.schema;
  if (!schema) {
    return new JsonSchemaWrapper({}, props.sessionMode, false);
  }
  return schema;
});

function zoomIntoPath(pathToAdd: Path) {
  session.updateCurrentPath(session.currentPath.value.concat(pathToAdd));
  session.updateCurrentSelectedElement(session.currentPath.value);
}

function selectPath(path: Path) {
  session.updateCurrentSelectedElement(path);
}
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <div class="flex-grow overflow-y-auto">
      <VueFlowPanel
        :currentPath="session.currentPath.value"
        :sessionMode="props.sessionMode"
        @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
        @select_path="selectedPath => selectPath(selectedPath)" />
    </div>
  </div>
</template>

<style scoped></style>
