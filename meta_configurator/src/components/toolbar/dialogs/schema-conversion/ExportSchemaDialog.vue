<!--
  Export the current MetaConfigurator schema (JSON Schema) to another modeling
  language (XSD, SHACL, LinkML, MdModels, GraphQL, …) via the
  Schema Conversion Orchestrator service.

  Flow: pick a target language -> convert -> the ranked attempts are shown.
  Each successful attempt can be copied to the clipboard or downloaded as a file.
  Schema conversions are usually lossy and ambiguous, so users must verify the
  result.
-->
<script setup lang="ts">
import {computed, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Message from 'primevue/message';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {toastService} from '@/utility/toastService';
import ConversionAttemptView from '@/components/toolbar/dialogs/schema-conversion/ConversionAttemptView.vue';
import {
  EXPORT_TARGET_LANGUAGES,
  fileExtensionForLanguage,
  hasSuccessfulAttempt,
  JSON_SCHEMA_LANGUAGE,
  requestSchemaConversion,
  selectDisplayedAttempts,
  type ConversionAttempt,
} from '@/utility/backend/schemaConverterApi';

const showDialog = ref(false);
const isLoading = ref(false);

const selectedLanguage = ref<string>('');

const attempts = ref<ConversionAttempt[]>([]);
const requestError = ref('');
const hasConverted = ref(false);

const displayedAttempts = computed(() => selectDisplayedAttempts(attempts.value));
const anySuccess = computed(() => hasSuccessfulAttempt(attempts.value));
const canConvert = computed(() => !isLoading.value && selectedLanguage.value.length > 0);

function resetResults() {
  attempts.value = [];
  requestError.value = '';
  hasConverted.value = false;
}

function openDialog() {
  selectedLanguage.value = '';
  isLoading.value = false;
  resetResults();
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function currentSchemaTitle(): string {
  const schema = getDataForMode(SessionMode.SchemaEditor).data.value;
  return (schema && typeof schema === 'object' && schema.title) || 'schema';
}

async function convert() {
  if (!canConvert.value) {
    return;
  }
  const schema = getDataForMode(SessionMode.SchemaEditor).data.value;
  if (!schema || (typeof schema === 'object' && Object.keys(schema).length === 0)) {
    requestError.value = 'The current schema is empty. There is nothing to export.';
    return;
  }

  isLoading.value = true;
  resetResults();
  try {
    attempts.value = await requestSchemaConversion(
      JSON.stringify(schema),
      JSON_SCHEMA_LANGUAGE,
      selectedLanguage.value
    );
    hasConverted.value = true;
    if (attempts.value.length === 0) {
      requestError.value = 'The service returned no conversion attempts for this target language.';
    }
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isLoading.value = false;
  }
}

function copyResult(attempt: ConversionAttempt) {
  navigator.clipboard.writeText(attempt.result ?? '').then(() =>
    toastService.add({
      severity: 'info',
      summary: 'Copied',
      detail: 'Converted schema copied to clipboard.',
      life: 2500,
    })
  );
}

function downloadResult(attempt: ConversionAttempt) {
  const extension = fileExtensionForLanguage(selectedLanguage.value);
  const fileName = `${currentSchemaTitle()}${extension}`;
  const blob = new Blob([attempt.result ?? ''], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Export Schema to another format"
    :style="{maxWidth: '90%', minWidth: '60%', margin: 'auto'}">
    <div class="dialog-content" :style="{cursor: isLoading ? 'wait' : 'default'}">
      <p class="dialog-intro">
        Convert the current JSON Schema into another modeling language. Each result can be copied or
        downloaded. These conversions are usually lossy and ambiguous: different valid results are
        possible depending on the conventions used by the conversion algorithms. Verify the
        converted schema before using it.
      </p>

      <div class="form">
        <div class="field">
          <label class="field-label">Source</label>
          <div class="field-control">
            <span class="static-value">JSON Schema (current schema)</span>
          </div>
        </div>

        <div class="field">
          <label class="field-label">Target format</label>
          <div class="field-control">
            <Select
              v-model="selectedLanguage"
              :options="EXPORT_TARGET_LANGUAGES"
              option-label="label"
              option-value="value"
              placeholder="Select target format"
              class="format-select"
              :disabled="isLoading" />
          </div>
        </div>

        <div class="field-actions">
          <Button :disabled="!canConvert" :loading="isLoading" @click="convert">Convert</Button>
        </div>
      </div>

      <div v-if="isLoading" class="text-sm text-gray-500">Converting, please wait…</div>

      <Message v-if="requestError" severity="error" :closable="false">
        {{ requestError }}
      </Message>

      <div v-if="displayedAttempts.length > 0" class="results">
        <p class="results-heading">
          <template v-if="anySuccess">
            {{ displayedAttempts.length }} best
            {{ displayedAttempts.length === 1 ? 'result' : 'results' }} (ranked):
          </template>
          <template v-else>
            No conversion path succeeded. Showing
            {{ displayedAttempts.length === 1 ? 'the failed attempt' : 'the failed attempts' }}:
          </template>
        </p>
        <ConversionAttemptView
          v-for="(attempt, i) in displayedAttempts"
          :key="i"
          :attempt="attempt"
          :index="i">
          <template #actions="{attempt: a}">
            <Button size="small" @click="copyResult(a)">
              <FontAwesomeIcon icon="fa-regular fa-copy" class="mr-2" />
              Copy
            </Button>
            <Button size="small" severity="secondary" @click="downloadResult(a)">
              <FontAwesomeIcon icon="fa-solid fa-download" class="mr-2" />
              Download
            </Button>
          </template>
        </ConversionAttemptView>
      </div>

      <Message v-else-if="hasConverted && !requestError" severity="warn" :closable="false">
        No conversion attempts were returned.
      </Message>
    </div>
  </Dialog>
</template>

<style scoped>
.dialog-content {
  padding: 0.5rem 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: min(32rem, 80vw);
}

.dialog-intro {
  margin: 0;
  color: var(--p-text-muted-color);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.field-label {
  flex: 0 0 7rem;
  font-weight: 600;
}

.field-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  min-width: 0;
}

.format-select {
  min-width: 14rem;
}

.static-value {
  color: var(--p-text-color);
}

.field-actions {
  margin-top: 0.25rem;
}

.results {
  display: flex;
  flex-direction: column;
}

.results-heading {
  font-weight: 600;
  margin-bottom: 0.25rem;
}
</style>
