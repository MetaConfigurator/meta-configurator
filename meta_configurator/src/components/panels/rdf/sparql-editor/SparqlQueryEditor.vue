<template>
  <div class="sparql-query-editor">
    <div class="ace-container" :id="editor_id" />
    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, onUnmounted, ref, watch} from 'vue';
import type {Editor} from 'brace';
import * as ace from 'brace';
import 'brace/theme/clouds';
import 'brace/theme/clouds_midnight';
import {isDark} from '@/components/panels/rdf/rdfUtils';
import {SparqlCustomMode} from '@/components/panels/rdf/aceSyntaxHighlighting';

const darkMode = isDark();
const props = withDefaults(
  defineProps<{
    modelValue: string;
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

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const editor_id = 'sparql-editor-' + Math.random();
const editor = ref<Editor | null>(null);
const markerId = ref<number | null>(null);
let isUpdatingFromOutside = false;
let stopClickListener: ((event: Event) => void) | null = null;
let stopKeydownListener: ((event: Event) => void) | null = null;

function applyErrorLine(line: number | null | undefined) {
  if (!editor.value) return;

  const session = editor.value.getSession();
  if (markerId.value !== null) {
    session.removeMarker(markerId.value);
    markerId.value = null;
  }
  session.clearAnnotations();

  if (!line || line <= 0) return;

  const aceLine = line - 1;
  const RangeCtor = ace.acequire('ace/range').Range;
  markerId.value = session.addMarker(
    new RangeCtor(aceLine, 0, aceLine, 1),
    'ace-error-line',
    'fullLine',
    true
  );
  session.setAnnotations([
    {
      row: aceLine,
      column: 0,
      text: props.errorMessage ?? 'Query error',
      type: 'error',
    },
  ]);
}

onMounted(() => {
  const instance = ace.edit(editor_id);
  editor.value = instance;

  instance.getSession().setMode(new (SparqlCustomMode as any)());
  instance.getSession().setUseWrapMode(true);
  instance.getSession().setTabSize(2);
  instance.setOption('wrap', true);
  instance.setShowPrintMargin(false);
  instance.setTheme(darkMode.value ? 'ace/theme/clouds_midnight' : 'ace/theme/clouds');
  instance.setValue(props.modelValue ?? '', -1);

  if (props.autofocus) {
    instance.focus();
  }

  instance.on('change', () => {
    if (isUpdatingFromOutside) {
      isUpdatingFromOutside = false;
      return;
    }
    emit('update:modelValue', instance.getValue());
  });

  stopClickListener = (event: Event) => {
    if (props.stopEvents) event.stopPropagation();
  };
  stopKeydownListener = (event: Event) => {
    if (props.stopEvents) event.stopPropagation();
  };
  instance.container.addEventListener('click', stopClickListener);
  instance.container.addEventListener('keydown', stopKeydownListener);

  applyErrorLine(props.errorLine);
});

onUnmounted(() => {
  if (!editor.value) return;
  if (stopClickListener) {
    editor.value.container.removeEventListener('click', stopClickListener);
    stopClickListener = null;
  }
  if (stopKeydownListener) {
    editor.value.container.removeEventListener('keydown', stopKeydownListener);
    stopKeydownListener = null;
  }
  editor.value.destroy();
  editor.value.container.remove();
  editor.value = null;
});

watch(
  () => props.modelValue,
  value => {
    if (!editor.value) return;
    const current = editor.value.getValue();
    if (value === current) return;
    isUpdatingFromOutside = true;
    editor.value.setValue(value ?? '', -1);
  }
);

watch(
  () => props.errorLine,
  line => {
    applyErrorLine(line);
  },
  {immediate: true}
);

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
