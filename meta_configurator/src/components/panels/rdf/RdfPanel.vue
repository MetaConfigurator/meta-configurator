<template>
  <div class="panel-container">
    <PanelSettings
      panel-name="RDF View"
      :panel-settings-path="['rdf']"
      :sessionMode="SessionMode.DataEditor">
    </PanelSettings>
    <RmlMappingDialog ref="rmlMappingDialog" />
    <div
      v-if="parsingWarnings.length > 0"
      class="border border-amber-400 bg-amber-100 text-amber-900 p-4 rounded-md m-1">
      <p class="font-semibold flex items-center gap-2">⚠️ Warnings:</p>
      <ul class="mt-2 list-disc list-inside">
        <li v-for="err in parsingWarnings" :key="err.id">
          {{ err.message }}
        </li>
      </ul>
    </div>
    <div
      v-if="parsingErrors.length > 0"
      class="border border-orange-500 bg-orange-100 text-orange-900 p-4 rounded-md m-1">
      <p class="font-semibold flex items-center gap-2">❗ Semantic issues detected:</p>
      <ul class="mt-2 list-disc list-inside">
        <li v-for="err in parsingErrors" :key="err.id">
          {{ err.message }}
        </li>
      </ul>
    </div>
    <div
      v-if="dataIsUnparsable"
      class="border border-red-500 bg-red-100 text-red-900 p-4 rounded-md m-1">
      <p class="font-semibold flex items-center gap-2">⛔ Syntax error</p>
      <p class="mt-1">Your data contains syntax errors. Please correct them before proceeding.</p>
    </div>
    <div
      v-if="!dataIsInJsonLd"
      class="border border-yellow-400 bg-yellow-100 text-yellow-900 p-4 rounded-md m-1">
      <p class="font-semibold flex items-center gap-2">ℹ️ JSON-LD required</p>
      <p class="mt-1">To use the RDF panel, your data must be in valid JSON-LD format.</p>
      <p class="mt-2">
        If your data is JSON, you can use
        <a
          href="#"
          @click.prevent="showRmlMappingDialog"
          class="font-medium text-blue-700 hover:underline">
          JSON → JSON-LD
        </a>
        to convert it.
      </p>
    </div>
    <div class="panel-content">
      <RdfEditorPanel
        :dataIsUnparsable="dataIsUnparsable"
        :dataIsInJsonLd="dataIsInJsonLd"
        @zoom_into_path="zoomIntoPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, watch, computed} from 'vue';
import RdfEditorPanel from '@/components/panels/rdf/RdfEditorPanel.vue';
import {SessionMode} from '@/store/sessionMode';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import RmlMappingDialog from '@/components/toolbar/dialogs/rml-mapping/RmlMappingDialog.vue';
import type {Path} from '@/utility/path';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';

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

const parsingErrors = computed(() => {
  return rdfStoreManager.parseErrors.value.map((msg, index) => ({
    id: index,
    message: msg,
  }));
});

const parsingWarnings = computed(() => {
  return rdfStoreManager.parseWarnings.value.map((msg, index) => ({
    id: index,
    message: msg,
  }));
});

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
