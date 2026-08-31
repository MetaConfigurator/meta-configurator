<script setup lang="ts">
import {computed, nextTick, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import SelectButton from 'primevue/selectbutton';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import type {RefineSchemaSelection} from '@/schema/refinement/refineSchemaTypes';
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

const showDialog = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const inputSource = ref<'current' | 'files'>('files');
const selectedFile = ref<File | null>(null);
const refinementOptions = ref<SchemaRefinementOptionsController | null>(null);

const currentDataLink = getDataForMode(SessionMode.DataEditor);
const fileDialog = createLazySingleFileDialog('.json');
const hasCurrentData = computed(() => hasInferableCurrentData(currentDataLink.data.value));
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
  inputSource.value = hasInferableCurrentData(currentDataLink.data.value) ? 'current' : 'files';
  selectedFile.value = null;
  refinementOptions.value?.reset();
}

function openDialog() {
  resetDialog();
  showDialog.value = true;
  nextTick(() => {
    refinementOptions.value?.reset();
  });
}

function hideDialog() {
  showDialog.value = false;
}

function parseInstanceText(text: string): any {
  const jsonConverter = formatRegistry.getFormat('json').dataConverter;
  return jsonConverter.parse(text);
}

async function parseInstance(file: File): Promise<any> {
  return parseInstanceText(await readFileContent(file));
}

function hasInferableCurrentData(data: unknown): boolean {
  if (data === null || data === undefined) {
    return false;
  }
  if (Array.isArray(data)) {
    return data.length > 0;
  }
  if (typeof data === 'object') {
    return Object.keys(data).length > 0;
  }
  return true;
}

function selectInstanceFile() {
  fileDialog.openForSelection(files => {
    selectedFile.value = files.item(0);
    errorMessage.value = '';
  });
}

function buildSelection(): RefineSchemaSelection | null {
  return refinementOptions.value?.buildSelection() ?? null;
}

async function inferSchemaAndApplyRefinements() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    let schema: TopLevelSchema;
    let successDetail: string;
    const selection = buildSelection();

    if (usesCurrentDataSource.value) {
      const currentData = currentDataLink.data.value;

      if (!hasInferableCurrentData(currentData)) {
        errorMessage.value = 'Please load data into the Data Editor first.';
        return;
      }

      schema = inferJsonSchema(currentData) as TopLevelSchema;

      if (hasSelectedRefinements.value && selection) {
        schema = runSchemaRefinement(schema, currentData, selection);
      }

      successDetail = hasSelectedRefinements.value
        ? 'Generated a refined JSON Schema from the current data.'
        : 'Generated a JSON Schema from the current data.';
    } else {
      if (!selectedFile.value) {
        errorMessage.value = 'Please select a data file first.';
        return;
      }

      const instance = await parseInstance(selectedFile.value);
      currentDataLink.setData(instance);
      schema = inferJsonSchema(instance) as TopLevelSchema;

      if (hasSelectedRefinements.value && selection) {
        schema = runSchemaRefinement(schema, instance, selection);
      }

      successDetail = hasSelectedRefinements.value
        ? 'Loaded the selected file into the Data Editor and generated a refined JSON Schema.'
        : 'Loaded the selected file into the Data Editor and generated a JSON Schema.';
    }

    getDataForMode(SessionMode.SchemaEditor).setData(schema);
    toastService.add({
      severity: 'success',
      summary: 'Schema inferred',
      detail: successDetail,
      life: 3000,
    });
    hideDialog();
  } catch (error) {
    const prefix = usesCurrentDataSource.value
      ? 'Could not infer a schema from the current data.'
      : 'Could not infer a schema from the selected file. Make sure it is a valid JSON data instance.';
    errorMessage.value = `${prefix} (${error instanceof Error ? error.message : String(error)})`;
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
        uploaded JSON files.
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

:deep(.refinement-panel .p-panel-header) {
  padding: 1rem;
}

:deep(.refinement-panel .p-panel-content) {
  padding: 1rem;
}
</style>
