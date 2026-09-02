<!--
 Code Editor component based on Ace Editor. Supports different data formats.
 Synchronized with file data from the store.
 -->
<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import type {Editor} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/mode/yaml';
import 'brace/mode/xml';
import 'brace/theme/clouds';
import 'brace/theme/clouds_midnight';
import {setupAnnotationsFromValidationErrors} from '@/components/panels/code-editor/setupAnnotations';
import {
  setupLinkToCurrentSelection,
  setupLinkToData,
} from '@/components/panels/code-editor/setupLinkToSelectionAndData';
import {useSettings} from '@/settings/useSettings';
import {SessionMode} from '@/store/sessionMode';
import {
  connectAceUndoManagerToGlobalUndo,
  setupAceMode,
  setupAceProperties,
} from '@/components/panels/shared-components/aceUtils';
import Message from 'primevue/message';
import {sizeOf} from '@/utility/sizeOf';
import {getDataForMode} from '@/data/useDataLink';
import {createAceEditorElementId} from '@/components/panels/shared-components/useAceEditor';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const settings = useSettings();

const editorElementId = createAceEditorElementId(`code-editor-${props.sessionMode}`);
const editor = ref<Editor | null>(null);
let editorResizeObserver: ResizeObserver | null = null;
let disposeAceMode: (() => void) | undefined;
let disposeAceProperties: (() => void) | undefined;

onMounted(() => {
  editor.value = ace.edit(editorElementId);

  editor.value.getSession().setUseWrapMode(true);
  editor.value.setOption('wrap', true);
  editor.value.setOption('hScrollBarAlwaysVisible', false);

  disposeAceMode = setupAceMode(editor.value, settings.value);
  disposeAceProperties = setupAceProperties(editor.value, settings.value);
  connectAceUndoManagerToGlobalUndo(editor.value, getDataForMode(props.sessionMode).undoManager);

  setupLinkToData(editor.value, props.sessionMode);
  setupLinkToCurrentSelection(editor.value, props.sessionMode);
  setupAnnotationsFromValidationErrors(editor.value, props.sessionMode);

  editorResizeObserver = new ResizeObserver(() => {
    editor.value?.resize();
  });
  const editorElement = document.getElementById(editorElementId);
  if (editorElement) {
    editorResizeObserver.observe(editorElement);
  }
});

onBeforeUnmount(() => {
  editorResizeObserver?.disconnect();
  editorResizeObserver = null;
  disposeAceMode?.();
  disposeAceProperties?.();
  editor.value?.destroy();
  editor.value = null;
});

const featuresDisabledForPerformance = computed(() => {
  if (!editor.value) {
    return false;
  }
  const performanceSettings = settings.value.performance;
  const editorContentSize = sizeOf(editor.value.getValue());
  return (
    editorContentSize > performanceSettings.maxDocumentSizeForValidation ||
    editorContentSize > performanceSettings.maxDocumentSizeForCursorSynchronization
  );
});
</script>

<template>
  <Message v-if="featuresDisabledForPerformance" severity="warn"
    >Some editor features are disabled for performance reasons due to the large size of the
    document.</Message
  >
  <div class="h-full" :id="editorElementId" />
</template>
