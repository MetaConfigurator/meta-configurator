<template>
  <div class="panel-container">
    <PanelSettings
      panel-name="RDF View"
      :panel-settings-path="['rdf']"
      :sessionMode="SessionMode.DataEditor">
    </PanelSettings>
    <RmlMappingDialog ref="rmlMappingDialog" />
    <Message v-if="parsingWarnings.length > 0" severity="warn">
      <li v-for="err in parsingWarnings" :key="err.id">
        <span v-html="err.message" @click="handleLink"></span>
      </li>
    </Message>
    <Message v-if="parsingErrors.length > 0" severity="error">
      <li v-for="err in parsingErrors" :key="err.id">
        <span v-html="err.message" @click="handleLink"></span>
      </li>
    </Message>
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
import Message from 'primevue/message';

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
const missingContext = ref(false);
const missingGraph = ref(false);

const parsingErrors = computed(() => {
  const baseErrors = rdfStoreManager.parseErrors.value.map((msg, index) => ({
    id: `parse-error-${index}`,
    message: msg,
  }));

  if (dataIsUnparsable.value) {
    baseErrors.push({
      id: 'data-unparsable',
      message: 'Your data contains syntax errors. Please correct them before proceeding.',
    });
  }

  return baseErrors;
});

const parsingWarnings = computed(() => {
  const baseWarnings = rdfStoreManager.parseWarnings.value.map((msg, index) => ({
    id: `parse-warn-${index}`,
    message: msg,
  }));

  if (missingContext.value) {
    baseWarnings.push({
      id: 'missing-context',
      message: 'Missing @context section in the JSON-LD data.',
    });
  }

  if (missingGraph.value) {
    baseWarnings.push({
      id: 'missing-graph',
      message: 'Missing @graph section in the JSON-LD data.',
    });
  }

  if (!dataIsInJsonLd.value) {
    baseWarnings.push({
      id: 'data-not-jsonld',
      message: `To use this panel, your data must be in expected JSON-LD format. 
      If your data is already in JSON format, you can use <a href="#" class="alert-link" data-action="open-rml">JSON to JSON-LD</a> converter.`,
    });
  }

  return baseWarnings;
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
  if (!input || typeof input !== 'object') {
    missingContext.value = true;
    missingGraph.value = true;
    return false;
  }
  const data = input as Record<string, unknown>;
  const hasContext = '@context' in data;
  const hasGraph = '@graph' in data;

  missingContext.value = !hasContext;
  missingGraph.value = !hasGraph;

  if (!hasContext) return false;

  if (hasGraph) {
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

function handleLink(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target instanceof HTMLAnchorElement && target.dataset.action === 'open-rml') {
    event.preventDefault();
    showRmlMappingDialog();
  }
}
</script>
<style scoped>
.alert-list :deep(.alert-link),
:deep(.alert-link) {
  color: #1d4ed8;
  text-decoration: none;
  font-weight: 500;
}

.alert-list :deep(.alert-link:hover),
:deep(.alert-link:hover) {
  text-decoration: underline;
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
