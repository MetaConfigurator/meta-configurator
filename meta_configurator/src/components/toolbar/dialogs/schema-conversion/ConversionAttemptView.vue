<!--
  Renders a single schema-conversion attempt.

  - Conversion path: LangA -> LangB -> ... -> target, with the converter
    library name shown above each arrow (edge).
  - On success: a scrollable code box with the resulting schema, plus an
    `actions` slot for dialog-specific buttons (e.g. Apply / Copy / Download).
  - On failure: a shortened red error box with a built-in copy button.
-->
<script setup lang="ts">
import {computed} from 'vue';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {toastService} from '@/utility/toastService';
import {
  failedStepIndex,
  languageLabel,
  type ConversionAttempt,
} from '@/utility/backend/schemaConverterApi';

const props = defineProps<{
  attempt: ConversionAttempt;
  index: number;
}>();

// Index of the path step (edge) that caused the failure, or -1 if not applicable.
const failedIndex = computed(() => failedStepIndex(props.attempt));

const MAX_ERROR_PREVIEW = 600;

const errorPreview = computed(() => {
  const message = props.attempt.result ?? '';
  if (message.length <= MAX_ERROR_PREVIEW) {
    return message;
  }
  return message.slice(0, MAX_ERROR_PREVIEW) + '\n… (truncated, use copy to get the full message)';
});

function copyError() {
  navigator.clipboard.writeText(props.attempt.result ?? '').then(() =>
    toastService.add({
      severity: 'info',
      summary: 'Copied',
      detail: 'Error message copied to clipboard.',
      life: 2500,
    })
  );
}
</script>

<template>
  <div class="attempt">
    <!-- Conversion path: language nodes separated by labeled arrows -->
    <div class="conversion-path">
      <span class="attempt-rank">#{{ index + 1 }}</span>
      <template v-for="(step, i) in attempt.conversionPath" :key="i">
        <span class="lang-node">{{ languageLabel(step.sourceLanguage) }}</span>
        <span class="path-edge" :class="{'edge-failed': i === failedIndex}" tabindex="0">
          <span class="converter-name">{{ step.converterName }}</span>
          <span class="arrow">→</span>
          <!-- Rich hover/focus tooltip: library name, version and clickable link. -->
          <span class="edge-tooltip" role="tooltip">
            <span class="tooltip-converter">{{ step.converterName }}</span>
            <span v-if="step.library" class="tooltip-library">
              Library: {{ step.library
              }}<template v-if="step.libraryVersion"> v{{ step.libraryVersion }}</template>
            </span>
            <span v-else class="tooltip-library tooltip-muted">Library: unknown</span>
            <a
              v-if="step.libraryUrl"
              class="tooltip-link"
              :href="step.libraryUrl"
              target="_blank"
              rel="noopener noreferrer"
              >{{ step.libraryUrl }}</a
            >
            <span v-if="i === failedIndex" class="tooltip-failed"
              >This step failed — see the error below.</span
            >
          </span>
        </span>
        <span
          v-if="i === attempt.conversionPath.length - 1"
          class="lang-node"
          :class="{'node-failed': i === failedIndex}">
          {{ languageLabel(step.targetLanguage) }}
        </span>
      </template>
    </div>

    <!-- Success: code box + caller-provided actions -->
    <template v-if="attempt.success">
      <div class="code-container">
        <pre><code>{{ attempt.result }}</code></pre>
      </div>
      <div class="attempt-actions">
        <slot name="actions" :attempt="attempt" />
      </div>
    </template>

    <!-- Failure: shortened red error box with a copy button -->
    <template v-else>
      <div class="error-container">
        <div class="error-header">
          <FontAwesomeIcon icon="fa-solid fa-triangle-exclamation" />
          <span>Conversion failed along this path</span>
          <Button
            class="copy-error-button"
            size="small"
            text
            severity="danger"
            @click="copyError"
            v-tooltip.bottom="'Copy full error message'">
            <FontAwesomeIcon icon="fa-regular fa-copy" />
          </Button>
        </div>
        <pre class="error-message">{{ errorPreview }}</pre>
      </div>
    </template>
  </div>
</template>

<style scoped>
.attempt {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--surface-border);
}

.conversion-path {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.4rem;
  font-size: 0.9rem;
}

.attempt-rank {
  font-weight: 700;
  color: var(--p-text-muted-color);
  margin-right: 0.25rem;
  align-self: center;
}

.lang-node {
  background: var(--p-surface-200, #e5e7eb);
  color: var(--p-text-color, #374151);
  border: 1px solid var(--p-surface-300, #d1d5db);
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
  white-space: nowrap;
  align-self: center;
  font-weight: 500;
}

.path-edge {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
  position: relative;
  cursor: help;
  outline: none;
}

.converter-name {
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Rich tooltip shown above the edge on hover/focus; stays interactive so the
   library link can be clicked (it is a descendant, so :hover persists). */
.edge-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 11rem;
  max-width: 22rem;
  margin-bottom: 6px;
  padding: 0.5rem 0.6rem;
  background: var(--p-surface-900, #111827);
  color: var(--p-surface-0, #f9fafb);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  font-size: 0.72rem;
  text-align: left;
  white-space: normal;
  word-break: break-word;
  z-index: 30;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.1s ease-in-out;
}

.path-edge:hover .edge-tooltip,
.path-edge:focus-within .edge-tooltip,
.path-edge:focus .edge-tooltip {
  visibility: visible;
  opacity: 1;
}

/* Caret pointing down at the edge; also bridges the 6px gap so moving the
   cursor into the tooltip does not dismiss it. */
.edge-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  width: 16px;
  height: 6px;
  transform: translateX(-50%);
  background: transparent;
}

.edge-tooltip::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--p-surface-900, #111827);
}

.tooltip-converter {
  font-weight: 700;
}

.tooltip-library {
  color: var(--p-surface-200, #e5e7eb);
}

.tooltip-muted {
  font-style: italic;
  opacity: 0.85;
}

.tooltip-link {
  color: var(--p-primary-300, #93c5fd);
  text-decoration: underline;
  word-break: break-all;
}

.tooltip-link:hover {
  text-decoration: underline;
  filter: brightness(1.15);
}

.tooltip-failed {
  margin-top: 0.15rem;
  color: var(--p-red-300, #fca5a5);
  font-weight: 600;
}

.arrow {
  font-size: 1.1rem;
  color: var(--p-text-muted-color);
}

/* The step (edge) that caused the failure is highlighted in red. */
.edge-failed .converter-name,
.edge-failed .arrow {
  color: var(--p-red-500, #ef4444);
  font-weight: 700;
}

.node-failed {
  background: var(--p-red-500, #ef4444);
  color: #fff;
  border-color: var(--p-red-500, #ef4444);
}

.code-container {
  max-height: 240px;
  width: 100%;
  overflow: auto;
  background: var(--p-primary-background);
  color: var(--p-primary-color);
  padding: 10px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
}

.code-container pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.attempt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.error-container {
  width: 100%;
  border: 1px solid var(--p-red-400, #f87171);
  background: var(--p-red-50, #fef2f2);
  color: var(--p-red-700, #b91c1c);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.copy-error-button {
  margin-left: auto;
}

.error-message {
  margin: 0.4rem 0 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  max-height: 160px;
  overflow: auto;
}
</style>
