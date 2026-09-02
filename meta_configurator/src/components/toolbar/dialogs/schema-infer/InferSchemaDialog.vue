<script setup lang="ts">
import {computed, nextTick, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import SelectButton from 'primevue/selectbutton';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import type {SchemaRefinementOptionsController} from '@/schema/refinement/schemaRefinementOptionsController';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {readFileContent} from '@/utility/readFileContent';
import {createLazySingleFileDialog} from '@/utility/fileDialogUtils';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {runSchemaRefinement} from '@/schema/refinement/runSchemaRefinement';
import {toastService} from '@/utility/toastService';
import SchemaRefinementOptions from '@/components/toolbar/dialogs/shared/SchemaRefinementOptions.vue';
import {hasJsonContent} from '@/utility/jsonCompatible';
import {getErrorMessage} from '@/utility/getErrorMessage';

const showDialog = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const inputSource = ref<'current' | 'files'>('files');
const selectedFile = ref<File | null>(null);
const refinementOptions = ref<SchemaRefinementOptionsController | null>(null);

const currentDataLink = getDataForMode(SessionMode.DataEditor);
const fileDialog = createLazySingleFileDialog('.json');
const hasCurrentData = computed(() => hasJsonContent(currentDataLink.data.value));
const hasSelectedFile = computed(() => selectedFile.value !== null);
const usesCurrentDataSource = computed(() => inputSource.value === 'current');
const canInfer = computed(() =>
  usesCurrentDataSource.value ? hasCurrentData.value : hasSelectedFile.value
);
const selectedFileName = computed(() => selectedFile.value?.name ?? '');
const hasSelectedRefinements = computed(
  () => refinementOptions.value?.hasSelectedRefinements() ?? false
);
const inputSourceOptions = computed(() => [
  {label: 'Current data', value: 'current', disabled: !hasCurrentData.value},
  {label: 'Upload file', value: 'files'},
]);
const applyButtonLabel = computed(() =>
  hasSelectedRefinements.value ? 'Apply and Infer Schema' : 'Infer Schema'
);

function resetDialog() {
  errorMessage.value = '';
  isLoading.value = false;
  inputSource.value = hasCurrentData.value ? 'current' : 'files';
  selectedFile.value = null;
}

function openDialog() {
  resetDialog();
  showDialog.value = true;
  // The options component is only mounted with the dialog, so reset it once it exists.
  nextTick(() => refinementOptions.value?.reset());
}

function hideDialog() {
  showDialog.value = false;
}

function selectInstanceFile() {
  fileDialog.openForSelection(files => {
    selectedFile.value = files.item(0);
    errorMessage.value = '';
  });
}

/**
 * Returns the data to infer from, wrapped so that a null data value stays distinguishable
 * from an unavailable source. Reports the reason and returns null when nothing is usable.
 */
async function resolveInputData(): Promise<{
  data: unknown;
  shouldLoadIntoDataEditor: boolean;
} | null> {
  if (usesCurrentDataSource.value) {
    if (!hasCurrentData.value) {
      errorMessage.value = 'Please load data into the Data Editor first.';
      return null;
    }
    return {data: currentDataLink.data.value, shouldLoadIntoDataEditor: false};
  }

  if (!selectedFile.value) {
    errorMessage.value = 'Please select a data file first.';
    return null;
  }

  const fileText = await readFileContent(selectedFile.value);
  const fileData = formatRegistry.getFormat('json').dataConverter.parse(fileText);
  return {data: fileData, shouldLoadIntoDataEditor: true};
}

function inferAndRefineSchema(inputData: unknown): TopLevelSchema {
  const inferredSchema = inferJsonSchema(inputData) as TopLevelSchema;
  const selection = hasSelectedRefinements.value ? refinementOptions.value?.buildSelection() : null;
  return selection ? runSchemaRefinement(inferredSchema, inputData, selection) : inferredSchema;
}

function buildSuccessDetail(): string {
  const schemaDescription = hasSelectedRefinements.value
    ? 'a refined JSON Schema'
    : 'a JSON Schema';
  return usesCurrentDataSource.value
    ? `Generated ${schemaDescription} from the current data.`
    : `Loaded the selected file into the Data Editor and generated ${schemaDescription}.`;
}

async function inferSchemaAndApplyRefinements() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const inputData = await resolveInputData();
    if (!inputData) {
      return;
    }

    const inferredSchema = inferAndRefineSchema(inputData.data);
    if (inputData.shouldLoadIntoDataEditor) {
      currentDataLink.setData(inputData.data);
    }
    getDataForMode(SessionMode.SchemaEditor).setData(inferredSchema);
    toastService.add({
      severity: 'success',
      summary: 'Schema inferred',
      detail: buildSuccessDetail(),
      life: 3000,
    });
    hideDialog();
  } catch (error) {
    const prefix = usesCurrentDataSource.value
      ? 'Could not infer a schema from the current data.'
      : 'Could not infer a schema from the selected file. Make sure it is a valid JSON data instance.';
    errorMessage.value = `${prefix} (${getErrorMessage(error)})`;
  } finally {
    isLoading.value = false;
  }
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Smart Schema Inference Dialog"
    :modal="true"
    :style="{width: '50rem', maxWidth: '95vw'}">
    <div class="dialog-content" :style="{cursor: isLoading ? 'wait' : 'default'}">
      <Message severity="info" :closable="false">
        Choose whether the schema should be inferred from the current Data Editor content or from an
        uploaded JSON file.
      </Message>

      <div class="input-source-card">
        <div class="input-source-header">
          <span class="font-semibold">Source</span>
          <SelectButton
            v-model="inputSource"
            class="input-source-select"
            :options="inputSourceOptions"
            option-label="label"
            option-value="value"
            option-disabled="disabled" />
        </div>

        <template v-if="!usesCurrentDataSource">
          <div class="file-picker-card">
            <div class="file-picker-header">
              <span class="font-semibold">Selected Data File</span>
              <Button :disabled="isLoading" :loading="isLoading" @click="selectInstanceFile">
                Select data file
              </Button>
            </div>

            <p class="file-picker-description">Select exactly one JSON file to use as input.</p>

            <div v-if="hasSelectedFile" class="selected-files">
              <div class="selected-files-label">1 file selected</div>
              <div class="selected-file-name">{{ selectedFileName }}</div>
            </div>

            <p v-else class="file-picker-empty">No file selected yet.</p>
          </div>
        </template>
      </div>

      <Message v-if="!hasCurrentData" severity="warn" :closable="false">
        No data is currently loaded in the Data Editor. Use file upload instead.
      </Message>

      <SchemaRefinementOptions
        ref="refinementOptions"
        id-prefix="infer"
        add-examples-description="Add real example values from the selected data instances to matching schema fields." />

      <div v-if="isLoading" class="text-sm text-gray-500">
        Inferring schema from the selected input source and applying selected refinement steps,
        please wait...
      </div>

      <Message v-if="errorMessage" severity="error" :closable="false">
        {{ errorMessage }}
      </Message>

      <div class="dialog-actions">
        <Button label="Cancel" severity="secondary" text @click="hideDialog" />
        <Button
          :label="applyButtonLabel"
          icon="pi pi-check"
          :disabled="!canInfer || isLoading"
          :loading="isLoading"
          @click="inferSchemaAndApplyRefinements" />
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-source-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: var(--content-border-radius);
  background: var(--surface-card);
}

.input-source-header,
.file-picker-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.file-picker-description,
.file-picker-empty {
  margin: 0;
  color: var(--text-color-secondary);
}

.file-picker-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.9rem;
  border: 1px solid var(--surface-border);
  border-radius: var(--content-border-radius);
  background: color-mix(in srgb, var(--surface-card) 85%, var(--surface-ground));
}

.selected-files {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.selected-files-label {
  font-weight: 600;
}

.selected-file-name {
  color: var(--text-color-secondary);
  padding-left: 0.1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

:deep(.input-source-select .p-button) {
  min-width: 8.75rem;
}
</style>
