<template>
  <div class="sparql-query-editor">
    <codemirror
      v-model="localValue"
      :autofocus="autofocus"
      :indent-with-tab="true"
      :tab-size="2"
      :extensions="extensions"
      @ready="handleReady"
      @click.stop="onClick"
      @keydown.stop="onKeydown" />
    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, shallowRef, watch} from 'vue';
import {Codemirror} from 'vue-codemirror';
import {basicSetup} from 'codemirror';
import {sparql} from 'codemirror-lang-sparql';
import {syntaxHighlighting, HighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {oneDark} from '@codemirror/theme-one-dark';
import {StateEffect, StateField} from '@codemirror/state';
import {EditorView, Decoration} from '@codemirror/view';
import {isDarkMode} from '@/utility/darkModeUtils';

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

const localValue = ref(props.modelValue);
const view = shallowRef<any>(null);

const addErrorLine = StateEffect.define<number>();
const clearErrorLines = StateEffect.define<null>();
const errorLineMark = Decoration.line({
  attributes: {class: 'cm-error-line'},
});

watch(
  () => props.modelValue,
  value => {
    if (value !== localValue.value) {
      localValue.value = value;
    }
  }
);

watch(localValue, value => {
  emit('update:modelValue', value);
});

const sparqlHighlightStyle = HighlightStyle.define([
  {tag: tags.keyword, color: '#c792ea', fontWeight: 'bold'},
  {tag: tags.variableName, color: '#82aaff'},
  {tag: tags.string, color: '#c3e88d'},
  {tag: tags.number, color: '#f78c6c'},
  {tag: tags.comment, color: '#5c6370', fontStyle: 'italic'},
  {tag: tags.operator, color: '#89ddff'},
  {tag: tags.punctuation, color: '#abb2bf'},
]);

const errorLineField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(addErrorLine)) {
        const lineNumber = effect.value;
        const maxLine = tr.state.doc.lines;
        const safeLine = Math.max(1, Math.min(maxLine, lineNumber));
        const line = tr.state.doc.line(safeLine);
        decorations = decorations.update({add: [errorLineMark.range(line.from)]});
      } else if (effect.is(clearErrorLines)) {
        decorations = Decoration.none;
      }
    }
    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
});

const extensions = computed(() => [
  basicSetup,
  sparql(),
  syntaxHighlighting(sparqlHighlightStyle),
  errorLineField,
  ...(isDarkMode.value ? [oneDark] : []),
]);

watch(
  () => props.errorLine,
  line => {
    if (!view.value) return;
    view.value.dispatch({effects: clearErrorLines.of(null)});
    if (line && line > 0) {
      view.value.dispatch({effects: addErrorLine.of(line)});
    }
  },
  {immediate: true}
);

function handleReady(payload: {view: any}) {
  view.value = payload.view;
  if (props.errorLine && props.errorLine > 0) {
    view.value.dispatch({effects: addErrorLine.of(props.errorLine)});
  }
}

function onClick(event: MouseEvent) {
  if (!props.stopEvents) return;
  event.stopPropagation();
}

function onKeydown(event: KeyboardEvent) {
  if (!props.stopEvents) return;
  event.stopPropagation();
}
</script>

<style scoped>
.sparql-query-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 12rem;
  height: 100%;
}

:deep(.cm-editor) {
  border: 1px solid var(--p-content-border-color, #d1d5db);
  border-radius: 0.375rem;
  overflow: hidden;
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

:deep(.cm-scroller) {
  overflow: auto;
  min-height: 12rem;
}

.error-box {
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #ffe5e5;
  color: #d8000c;
  font-size: 0.875rem;
  border: 1px solid #d8000c;
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
}

:deep(.cm-error-line) {
  border-left: 3px solid #f44336;
  animation: errorPulse 0.5s ease-in-out;
}

@keyframes errorPulse {
  0%,
  100% {
    background-color: #ffebee;
  }
  50% {
    background-color: #ffcdd2;
  }
}
</style>
