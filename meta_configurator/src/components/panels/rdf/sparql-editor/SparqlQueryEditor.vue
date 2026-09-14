<template>
  <div class="sparql-query-editor">
    <div class="ace-container" :id="editorElementId" />
    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import * as ace from 'brace';
import 'brace/theme/clouds';
import 'brace/theme/clouds_midnight';
import {SparqlCustomMode} from '@/components/panels/rdf/aceSyntaxHighlighting';
import {useAceEditor} from '@/components/panels/shared-components/useAceEditor';

const props = withDefaults(
  defineProps<{
    autofocus?: boolean;
    stopEvents?: boolean;
    errorLine?: number | null;
    errorMessage?: string | null;
  }>(),
  {
    autofocus: true,
    stopEvents: true,
    errorLine: null,
    errorMessage: null,
  }
);

const queryText = defineModel<string>({required: true});

const errorLineMarkerId = ref<number | null>(null);
const {editorElementId, editor, createEditor} = useAceEditor('sparql-editor', queryText, {
  mode: new (SparqlCustomMode as any)(),
  useWrapMode: true,
  // The composable owns the editor lifecycle, so it also runs this teardown on destroy.
  configureEditor: createdEditor => {
    createdEditor.container.addEventListener('click', stopEventFromLeavingEditor);
    createdEditor.container.addEventListener('keydown', stopEventFromLeavingEditor);
    return () => {
      createdEditor.container.removeEventListener('click', stopEventFromLeavingEditor);
      createdEditor.container.removeEventListener('keydown', stopEventFromLeavingEditor);
    };
  },
});

function stopEventFromLeavingEditor(event: Event) {
  if (props.stopEvents) {
    event.stopPropagation();
  }
}

function applyErrorLine(line: number | null | undefined) {
  if (!editor.value) return;

  const session = editor.value.getSession();
  if (errorLineMarkerId.value !== null) {
    session.removeMarker(errorLineMarkerId.value);
    errorLineMarkerId.value = null;
  }
  session.clearAnnotations();

  if (!line || line <= 0) return;

  const zeroBasedLine = line - 1;
  const Range = ace.acequire('ace/range').Range;
  errorLineMarkerId.value = session.addMarker(
    new Range(zeroBasedLine, 0, zeroBasedLine, 1),
    'ace-error-line',
    'fullLine',
    true
  );
  session.setAnnotations([
    {
      row: zeroBasedLine,
      column: 0,
      text: props.errorMessage ?? 'Query error',
      type: 'error',
    },
  ]);
}

onMounted(() => {
  createEditor();
  if (!editor.value) return;

  if (props.autofocus) {
    editor.value.focus();
  }
  applyErrorLine(props.errorLine);
});

watch(() => props.errorLine, applyErrorLine, {immediate: true});

watch(
  () => props.errorMessage,
  () => {
    if (props.errorLine && props.errorLine > 0) {
      applyErrorLine(props.errorLine);
    }
  }
);
</script>

<style scoped>
.sparql-query-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 12rem;
  height: 100%;
}

.ace-container {
  border: 1px solid var(--p-content-border-color, var(--p-border-color));
  border-radius: 0.375rem;
  overflow: hidden;
  min-height: 12rem;
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

.error-box {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: var(--p-red-100);
  color: var(--p-red-700);
  font-size: 0.875rem;
  border: 1px solid var(--p-red-700);
  flex-shrink: 0;
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
}

:deep(.ace-error-line) {
  position: absolute;
  background-color: color-mix(in srgb, var(--p-red-500) 20%, transparent);
}
</style>
