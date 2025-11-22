<template>
  <div class="panel-container">
    <div class="rdf-panel">
      <PanelSettings
        panel-name="RDF View"
        :panel-settings-path="['rdf']"
        :sessionMode="SessionMode.DataEditor">
      </PanelSettings>
      <RmlMappingDialog ref="rmlMappingDialog" />
      <div class="panel-content" style="display: flex; flex-direction: column; height: 100%">
        <ScrollPanel
          style="width: 100%; height: 100%"
          :dt="{
            bar: {
              background: '{primary.color}',
            },
          }">
          <div v-if="dataIsInJsonLd">
            <RdfEditorPanel :sessionMode="props.sessionMode" @zoom_into_path="zoomIntoPath" />
          </div>
          <div
            v-else
            class="border border-yellow-400 bg-yellow-50 text-yellow-800 p-4 rounded mt-1">
            To use RDF panel, your data should be in JSON-LD format. You can use
            <a href="#" @click.prevent="showRmlMappingDialog" class="text-blue-600 hover:underline">
              JSON to JSON-LD
            </a>
            utility to convert it to JSON-LD.
          </div>
        </ScrollPanel>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rdf-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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

<script setup lang="ts">
import {ref, watch} from 'vue';
import RdfEditorPanel from '@/components/panels/rdf/RdfEditorPanel.vue';
import {SessionMode} from '@/store/sessionMode';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import RmlMappingDialog from '@/components/toolbar/dialogs/rml-mapping/RmlMappingDialog.vue';
import type {Path} from '@/utility/path';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import {ScrollPanel} from 'primevue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const rmlMappingDialog = ref();

const dataIsInJsonLd = ref(false);

const emit = defineEmits<{
  (e: 'update_current_path', new_path: Path): void;
  (e: 'zoom_into_path', path_to_add: Path): void;
  (e: 'select_path', path: Path): void;
  (e: 'update_data', path: Path, newValue: any): void;
  (e: 'remove_property', path: Path): void;
}>();

const session = getSessionForMode(props.sessionMode);

function zoomIntoPath(path: Path) {
  session.updateCurrentPath(path);
  session.updateCurrentSelectedElement(session.currentPath.value);
}

watch(
  () => getDataForMode(props.sessionMode).data.value,
  async dataValue => {
    try {
      dataIsInJsonLd.value = isJsonLD(JSON.stringify(dataValue));
    } catch (err) {
      dataIsInJsonLd.value = false;
    }
  },
  {immediate: true}
);

function isJsonLD(inputData: string): boolean {
  try {
    const data = JSON.parse(inputData);
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    if (!data['@context']) {
      return false;
    }
    console.log('Data is valid JSON-LD');
    return true;
  } catch (error) {
    console.log('Data is not valid JSON-LD');
    return false;
  }
}

function showRmlMappingDialog() {
  rmlMappingDialog.value?.show();
}
</script>
