<!--
  Import a schema from another modeling language (XSD, SHACL, LinkML, MdModels, …)
  into MetaConfigurator by converting it to JSON Schema via the
  Schema Conversion Orchestrator service.

  Flow: select a file -> source language is auto-detected (and adjustable) ->
  convert -> the ranked attempts are shown. Each successful attempt can be
  applied as the current schema; failed attempts show a red error box. Schema
  conversions are usually lossy and ambiguous, so users must verify the result.
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
import {readFileContent} from '@/utility/readFileContent';
import {createLazySingleFileDialog} from '@/utility/fileDialogUtils';
import {toastService} from '@/utility/toastService';
import {useErrorService} from '@/utility/errorServiceInstance';
import ConversionAttemptView from '@/components/toolbar/dialogs/schema-conversion/ConversionAttemptView.vue';
import {
  detectSourceLanguage,
  hasSuccessfulAttempt,
  importFileAccept,
  IMPORT_SOURCE_LANGUAGES,
  JSON_SCHEMA_LANGUAGE,
  requestSchemaConversion,
  selectDisplayedAttempts,
  type ConversionAttempt,
} from '@/utility/backend/schemaConverterApi';

const showDialog = ref(false);
const isLoading = ref(false);

const selectedFileName = ref('');
const schemaContent = ref('');
const selectedLanguage = ref<string>('');

const attempts = ref<ConversionAttempt[]>([]);
const requestError = ref('');
const hasConverted = ref(false);

const fileDialog = createLazySingleFileDialog(importFileAccept());

const displayedAttempts = computed(() => selectDisplayedAttempts(attempts.value));
const anySuccess = computed(() => hasSuccessfulAttempt(attempts.value));
const canConvert = computed(
  () => !isLoading.value && schemaContent.value.length > 0 && selectedLanguage.value.length > 0
);

function resetResults() {
  attempts.value = [];
  requestError.value = '';
  hasConverted.value = false;
}

function openDialog() {
  selectedFileName.value = '';
  schemaContent.value = '';
  selectedLanguage.value = '';
  isLoading.value = false;
  resetResults();
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function selectFile() {
  fileDialog.openForSelection(async files => {
    const file = files[0];
    if (!file) {
      return;
    }
    try {
      schemaContent.value = await readFileContent(file);
      selectedFileName.value = file.name;
      resetResults();
      const detected = detectSourceLanguage(file.name);
      if (detected) {
        selectedLanguage.value = detected.value;
      }
    } catch (error) {
      useErrorService().onError(error);
    }
  });
}

async function convert() {
  if (!canConvert.value) {
    return;
  }
  isLoading.value = true;
  resetResults();
  try {
    attempts.value = await requestSchemaConversion(
      schemaContent.value,
      selectedLanguage.value,
      JSON_SCHEMA_LANGUAGE
    );
    hasConverted.value = true;
    if (attempts.value.length === 0) {
      requestError.value = 'The service returned no conversion attempts for this input.';
    }
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isLoading.value = false;
  }
}

function applySchema(attempt: ConversionAttempt) {
  let parsed: any;
  try {
    parsed = JSON.parse(attempt.result);
  } catch (error) {
    useErrorService().onError(
      new Error(
        'The converted result is not valid JSON and cannot be applied as a JSON Schema. ' +
          'You can still inspect it in the result box.'
      )
    );
    return;
  }
  getDataForMode(SessionMode.SchemaEditor).setData(parsed);
  toastService.add({
    severity: 'success',
    summary: 'Schema imported',
    detail: 'The converted JSON Schema has been applied.',
    life: 3000,
  });
  hideDialog();
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Import Schema from another format"
    :style="{maxWidth: '90%', minWidth: '60%', margin: 'auto'}">
    <div class="dialog-content" :style="{cursor: isLoading ? 'wait' : 'default'}">
      <p class="dialog-intro">
        Convert a schema from another modeling language into JSON Schema, then apply it as the
        current MetaConfigurator schema. These conversions are usually lossy and ambiguous:
        different valid results are possible depending on the conventions used by the conversion
        algorithms. Verify the converted schema before using it.
      </p>

      <div class="form">
        <div class="field">
          <label class="field-label">Source file</label>
          <div class="field-control">
            <Button size="small" :disabled="isLoading" @click="selectFile">
              <FontAwesomeIcon icon="fa-regular fa-folder-open" class="mr-2" />
              Select File
            </Button>
            <span v-if="selectedFileName" class="file-name" :title="selectedFileName">
              {{ selectedFileName }}
            </span>
            <span v-else class="field-placeholder">No file selected</span>
          </div>
        </div>

        <div class="field">
          <label class="field-label">Source format</label>
          <div class="field-control">
            <Select
              v-model="selectedLanguage"
              :options="IMPORT_SOURCE_LANGUAGES"
              option-label="label"
              option-value="value"
              placeholder="Select source format"
              class="format-select"
              :disabled="isLoading || schemaContent.length === 0" />
            <span class="arrow-hint">→ JSON Schema</span>
          </div>
        </div>

        <div class="field-actions">
          <Button :disabled="!canConvert" :loading="isLoading" @click="convert">Convert</Button>
        </div>
      </div>

      <div v-if="isLoading" class="text-sm text-gray-500">Converting, please wait…</div>

      <!-- Request-level error (service unreachable, no path, unknown language, …) -->
      <Message v-if="requestError" severity="error" :closable="false">
        {{ requestError }}
      </Message>

      <!-- Results -->
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
            <Button size="small" @click="applySchema(a)">
              <FontAwesomeIcon icon="fa-solid fa-check" class="mr-2" />
              Apply as current schema
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

.file-name {
  color: var(--p-text-color);
  max-width: 20rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-placeholder {
  color: var(--p-text-muted-color);
  font-style: italic;
}

.arrow-hint {
  font-weight: 600;
  color: var(--p-text-muted-color);
  white-space: nowrap;
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
