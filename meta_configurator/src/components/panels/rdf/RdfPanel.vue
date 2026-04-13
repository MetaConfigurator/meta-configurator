<template>
  <div class="panel-container">
    <PanelSettings
      panel-name="RDF View"
      :panel-settings-path="['rdf']"
      panel-display-name="RDF View"
      :sessionMode="SessionMode.DataEditor" />
    <RmlMappingDialog ref="rmlMappingDialog" />
    <ImportTurtleDialog ref="importTurtleDialog" />

    <Message v-if="parsingWarnings.length > 0" severity="warn" class="m-2">
      <li v-for="warn in parsingWarnings" :key="warn.id">
        <span v-html="warn.message" @click="handleLink" />
      </li>
    </Message>
    <Message v-if="parsingErrors.length > 0" severity="error" class="m-2">
      <li v-for="err in parsingErrors" :key="err.id">
        <span v-html="err.message" @click="handleLink" />
      </li>
    </Message>

    <div class="panel-content">
      <RdfTabPanel
        :dataIsUnparsable="dataIsUnparsable"
        :dataIsInJsonLd="dataIsInJsonLd"
        @zoom_into_path="zoomIntoPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, watch, computed} from 'vue';
import Message from 'primevue/message';
import RdfTabPanel from '@/components/panels/rdf/rdf-authoring/RdfTabPanel.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import RmlMappingDialog from '@/components/toolbar/dialogs/rml-mapping/RmlMappingDialog.vue';
import ImportTurtleDialog from '@/components/toolbar/dialogs/turtle-import/ImportTurtleDialog.vue';
import {SessionMode} from '@/store/sessionMode';
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
const importTurtleDialog = ref();

function showRmlMappingDialog() {
  rmlMappingDialog.value?.show();
}

function showImportTurtleDialog() {
  importTurtleDialog.value?.show();
}

const dataIsUnparsable = ref(false);
const dataIsInJsonLd = ref(false);
const missingContext = ref(false);

const parsingErrors = computed(() => {
  const errors = rdfStoreManager.parseErrors.value.map((msg, index) => ({
    id: `parse-error-${index}`,
    message: msg,
  }));

  if (dataIsUnparsable.value) {
    errors.push({
      id: 'data-unparsable',
      message: 'Your data contains syntax errors. Please correct them before proceeding.',
    });
  }

  return errors;
});

const parsingWarnings = computed(() => {
  const warnings = rdfStoreManager.parseWarnings.value.map((msg, index) => ({
    id: `parse-warn-${index}`,
    message: msg,
  }));

  if (missingContext.value) {
    warnings.push({
      id: 'missing-context',
      message: 'Missing @context section in the JSON-LD data.',
    });
  }

  if (!dataIsInJsonLd.value) {
    warnings.push({
      id: 'data-not-jsonld',
      message:
        `To use this panel, your data must be in expected JSON-LD format. ` +
        `If your data is already in JSON format, you can use ` +
        `<a href="#" class="alert-link" data-action="open-rml">JSON to JSON-LD</a> converter, ` +
        `or directly import <a href="#" class="alert-link" data-action="open-turtle">Turtle</a> data.`,
    });
  }

  return warnings;
});

watch(
  () => getDataForMode(props.sessionMode).isDataUnparseable(),
  value => {
    dataIsUnparsable.value = value;
  },
  {immediate: true}
);

watch(
  () => getDataForMode(props.sessionMode).data.value,
  value => {
    dataIsInJsonLd.value = hasJsonLdFormat(value);
  },
  {immediate: true}
);

function hasJsonLdFormat(input: unknown): boolean {
  if (!input || typeof input !== 'object') {
    missingContext.value = true;
    return false;
  }

  const data = input as Record<string, unknown>;
  const hasContext = '@context' in data;
  missingContext.value = !hasContext;

  if (!hasContext) return false;

  return Object.keys(data).some(k => k !== '@context');
}

function zoomIntoPath(path: Path): void {
  session.updateCurrentPath(path);
  session.updateCurrentSelectedElement(session.currentPath.value);
}

function handleLink(event: MouseEvent): void {
  const target = event.target;

  if (!(target instanceof HTMLAnchorElement)) return;

  const actions: Record<string, () => void> = {
    'open-rml': showRmlMappingDialog,
    'open-turtle': showImportTurtleDialog,
  };

  const action = actions[target.dataset.action ?? ''];
  if (action) {
    event.preventDefault();
    action();
  }
}
</script>

<style scoped>
.alert-list :deep(.alert-link),
:deep(.alert-link) {
  color: var(--p-blue-500);
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
