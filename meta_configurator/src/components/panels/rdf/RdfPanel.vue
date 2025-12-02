<template>
  <div class="panel-container">
    <PanelSettings
      panel-name="RDF View"
      :panel-settings-path="['rdf']"
      :sessionMode="SessionMode.DataEditor">
    </PanelSettings>
    <RmlMappingDialog ref="rmlMappingDialog" />
    <div
      v-if="dataIsUnparsable"
      class="border border-red-400 bg-red-50 text-yellow-800 p-4 rounded m-1">
      Your data contains syntax errors. Please correct them before proceeding.
    </div>
    <div class="panel-content" v-if="dataIsInJsonLd">
      <RdfEditorPanel :sessionMode="props.sessionMode" @zoom_into_path="zoomIntoPath" />
    </div>
    <div v-else class="border border-yellow-400 bg-yellow-50 text-yellow-800 p-4 rounded m-1">
      To use RDF panel, your data should be in valid JSON-LD format. If your data is in JSON, you
      can use
      <a href="#" @click.prevent="showRmlMappingDialog" class="text-blue-600 hover:underline">
        JSON to JSON-LD
      </a>
      utility to convert it to JSON-LD.
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue';
import RdfEditorPanel from '@/components/panels/rdf/RdfEditorPanel.vue';
import {SessionMode} from '@/store/sessionMode';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import RmlMappingDialog from '@/components/toolbar/dialogs/rml-mapping/RmlMappingDialog.vue';
import type {Path} from '@/utility/path';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
const emit = defineEmits<{
  (e: 'zoom_into_path', path: Path): void;
}>();
const session = getSessionForMode(props.sessionMode);
const rmlMappingDialog = ref();
const dataIsUnparsable = ref(false);
const dataIsInJsonLd = ref(false);

watch(
  () => getDataForMode(props.sessionMode).isDataUnparseable(),
  dataIsUnparsableValue => {
    dataIsUnparsable.value = dataIsUnparsableValue;
  },
  {immediate: true}
);

watch(
  () => getDataForMode(props.sessionMode).data.value,
  dataValue => {
    dataIsInJsonLd.value = hasJsonLdFormat(dataValue);
  },
  {immediate: true}
);

function hasJsonLdFormat(input: Object): boolean {
  if (!input || typeof input !== 'object') return false;
  const data = input as Record<string, unknown>;
  if (!('@context' in data)) return false;
  if ('@graph' in data) {
    return Array.isArray(data['@graph']) && data['@graph'].length > 0;
  }
  const keys = Object.keys(data).filter(k => k !== '@context');
  return keys.length > 0;
}

function zoomIntoPath(path: Path) {
  session.updateCurrentPath(path);
  session.updateCurrentSelectedElement(session.currentPath.value);
}

function showRmlMappingDialog() {
  rmlMappingDialog.value?.show();
}
</script>
<style scoped>
.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
.panel-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
