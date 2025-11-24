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
    <div v-else class="border border-yellow-400 bg-yellow-50 text-yellow-800 p-4 rounded mt-1">
      To use RDF panel, your data should be in JSON-LD format. You can use
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

const rmlMappingDialog = ref();

const dataIsInJsonLd = ref(false);

const emit = defineEmits<{
  (e: 'zoom_into_path', path: Path): void;
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
      dataIsInJsonLd.value = isValidJsonLd(JSON.stringify(dataValue));
    } catch (err) {
      dataIsInJsonLd.value = false;
    }
  },
  {immediate: true}
);

function isValidJsonLd(input: string): boolean {
  try {
    const parsed = JSON.parse(input);

    if (typeof parsed !== 'object' || parsed === null) {
      return false;
    }

    if (Array.isArray(parsed)) {
      return parsed.every(item => isJsonLdObject(item));
    }

    return isJsonLdObject(parsed);
  } catch (error) {
    return false;
  }
}

function isJsonLdObject(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }

  const hasJsonLdProperty = '@context' in obj || '@id' in obj || '@type' in obj || '@graph' in obj;

  if (!hasJsonLdProperty) {
    return false;
  }

  if ('@context' in obj) {
    const context = obj['@context'];
    const isValidContext =
      typeof context === 'string' ||
      typeof context === 'object' ||
      (Array.isArray(context) &&
        context.every(item => typeof item === 'string' || typeof item === 'object'));

    if (!isValidContext) {
      return false;
    }
  }

  if ('@id' in obj && typeof obj['@id'] !== 'string') {
    return false;
  }

  if ('@type' in obj) {
    const type = obj['@type'];
    const isValidType =
      typeof type === 'string' ||
      (Array.isArray(type) && type.every(item => typeof item === 'string'));

    if (!isValidType) {
      return false;
    }
  }

  return true;
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
