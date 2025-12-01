<template>
  <div class="panel-container">
    <PanelSettings
      panel-name="RDF View"
      :panel-settings-path="['rdf']"
      :sessionMode="SessionMode.DataEditor">
    </PanelSettings>
    <RmlMappingDialog ref="rmlMappingDialog" />
    <div class="panel-content" v-if="dataIsInJsonLd">
      <RdfEditorPanel :sessionMode="props.sessionMode" @zoom_into_path="zoomIntoPath" />
    </div>
    <div v-else class="border border-yellow-400 bg-yellow-50 text-yellow-800 p-4 rounded mt">
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
import * as jsonld from 'jsonld';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
const emit = defineEmits<{
  (e: 'zoom_into_path', path: Path): void;
}>();
const session = getSessionForMode(props.sessionMode);
const rmlMappingDialog = ref();
const dataHasSyntaxError = ref(false);
const dataIsInJsonLd = ref(false);

watch(
  () => getDataForMode(props.sessionMode).isDataUnparseable(),
  dataIsUnparsable => {
    dataHasSyntaxError.value = dataIsUnparsable;
  },
  {immediate: true}
);

watch(
  () => getDataForMode(props.sessionMode).data.value,
  async dataValue => {
    dataIsInJsonLd.value = await isValidJsonLd(dataValue);
  },
  {immediate: true}
);

async function isValidJsonLd(jsonText: string): Promise<boolean> {
  return jsonld
    .expand(jsonText)
    .then(() => true)
    .catch(() => false);
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
