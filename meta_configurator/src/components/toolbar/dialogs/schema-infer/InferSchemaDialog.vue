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
import {createLazyMultiFileDialog} from '@/utility/fileDialogUtils';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {inferJsonSchemaFromSamples} from '@/schema/inferJsonSchema';
import {runSchemaRefinementFromSamples} from '@/schema/refinement/runSchemaRefinement';
import {toastService} from '@/utility/toastService';
import SchemaRefinementOptions from '@/components/toolbar/dialogs/shared/SchemaRefinementOptions.vue';
import {hasJsonContent} from '@/utility/jsonCompatible';
import {getErrorMessage} from '@/utility/getErrorMessage';

const showDialog = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const inputSource = ref<'current' | 'files'>('files');
const selectedFiles = ref<File[]>([]);
const refinementOptions = ref<SchemaRefinementOptionsController | null>(null);

const currentDataLink = getDataForMode(SessionMode.DataEditor);
const fileDialog = createLazyMultiFileDialog(formatRegistry.getFileExtensions().join(','));
const hasCurrentData = computed(() => hasJsonContent(currentDataLink.data.value));
const usesCurrentDataSource = computed(() => inputSource.value === 'current');
const canInfer = computed(() =>
  usesCurrentDataSource.value ? hasCurrentData.value : selectedFiles.value.length > 0
);
const selectedFileNames = computed(() => selectedFiles.value.map(file => file.name));
const selectedFilesLabel = computed(() =>
  selectedFiles.value.length === 1
    ? '1 file selected'
    : `${selectedFiles.value.length} files selected`
);
const hasSelectedRefinements = computed(
  () => refinementOptions.value?.hasSelectedRefinements() ?? false
);
const inputSourceOptions = computed(() => [
  {label: 'Current data', value: 'current', disabled: !hasCurrentData.value},
  {label: 'Upload files', value: 'files'},
]);
const applyButtonLabel = computed(() =>
  hasSelectedRefinements.value ? 'Apply and Infer Schema' : 'Infer Schema'
);

function resetDialog() {
  errorMessage.value = '';
  isLoading.value = false;
  inputSource.value = hasCurrentData.value ? 'current' : 'files';
  selectedFiles.value = [];
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

function selectInstanceFiles() {
  fileDialog.openForSelection(files => {
    selectedFiles.value = Array.from(files);
    errorMessage.value = '';
  });
}

/** Parses one uploaded instance with the data format its file name belongs to. */
async function parseInstanceFile(file: File): Promise<unknown> {
  return formatRegistry.parseFileContent(file.name, await readFileContent(file));
}

/**
 * Returns the data instances to infer from, or null when the selected source has none.
 * A single uploaded file is also loaded into the Data Editor, so that the user sees the
 * data the schema belongs to; several instances have no single data document to show.
 */
async function resolveInputSamples(): Promise<{
  samples: unknown[];
  shouldLoadIntoDataEditor: boolean;
} | null> {
  if (usesCurrentDataSource.value) {
    if (!hasCurrentData.value) {
      errorMessage.value = 'Please load data into the Data Editor first.';
      return null;
    }
    return {samples: [currentDataLink.data.value], shouldLoadIntoDataEditor: false};
  }

  if (selectedFiles.value.length === 0) {
    errorMessage.value = 'Please select at least one data file first.';
    return null;
  }

  const samples = await Promise.all(selectedFiles.value.map(parseInstanceFile));
  return {samples, shouldLoadIntoDataEditor: samples.length === 1};
}

function inferAndRefineSchema(samples: unknown[]): TopLevelSchema {
  const inferredSchema = inferJsonSchemaFromSamples(samples) as TopLevelSchema;
  const selection = hasSelectedRefinements.value ? refinementOptions.value?.buildSelection() : null;
  return selection
    ? runSchemaRefinementFromSamples(inferredSchema, samples, selection)
    : inferredSchema;
}

function buildSuccessDetail(sampleCount: number, loadedIntoDataEditor: boolean): string {
  const schemaDescription = hasSelectedRefinements.value
    ? 'a refined JSON Schema'
    : 'a JSON Schema';
  if (usesCurrentDataSource.value) {
    return `Generated ${schemaDescription} from the current data.`;
  }
  if (loadedIntoDataEditor) {
    return `Loaded the selected file into the Data Editor and generated ${schemaDescription}.`;
  }
  return `Generated ${schemaDescription} satisfying all ${sampleCount} selected data instances.`;
}

async function inferSchemaAndApplyRefinements() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const inputSamples = await resolveInputSamples();
    if (!inputSamples) {
      return;
    }

    const inferredSchema = inferAndRefineSchema(inputSamples.samples);
    if (inputSamples.shouldLoadIntoDataEditor) {
      currentDataLink.setData(inputSamples.samples[0]);
    }
    getDataForMode(SessionMode.SchemaEditor).setData(inferredSchema);
    toastService.add({
      severity: 'success',
      summary: 'Schema inferred',
      detail: buildSuccessDetail(
        inputSamples.samples.length,
        inputSamples.shouldLoadIntoDataEditor
      ),
      life: 3000,
    });
    hideDialog();
  } catch (error) {
    const prefix = usesCurrentDataSource.value
      ? 'Could not infer a schema from the current data.'
      : 'Could not infer a schema from the selected files. Make sure they are valid JSON or YAML data instances.';
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
        Choose whether the schema should be inferred from the current Data Editor content or from
        uploaded JSON or YAML files. With several files the schema is built to satisfy all of them,
        so the more representative instances you provide, the more accurate it becomes.
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
              <span class="font-semibold">Selected Data Files</span>
              <Button :disabled="isLoading" :loading="isLoading" @click="selectInstanceFiles">
                Select data files
              </Button>
            </div>

            <p class="file-picker-description">
              Select one or more JSON or YAML files to use as input.
            </p>

            <div v-if="selectedFileNames.length > 0" class="selected-files">
              <div class="selected-files-label">{{ selectedFilesLabel }}</div>
              <div v-for="fileName in selectedFileNames" :key="fileName" class="selected-file-name">
                {{ fileName }}
              </div>
            </div>

            <p v-else class="file-picker-empty">No files selected yet.</p>
          </div>
        </template>
      </div>

      <Message v-if="!hasCurrentData" severity="warn" :closable="false">
        No data is currently loaded in the Data Editor. Upload data files instead.
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
