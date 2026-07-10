<script setup lang="ts">
import {computed, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import SelectButton from 'primevue/selectbutton';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {readFileContent} from '@/utility/readFileContent';
import {createLazySingleFileDialog} from '@/utility/fileDialogUtils';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {toastService} from '@/utility/toastService';
import {
  ADD_EXAMPLES_DEFAULTS,
  DETECT_ADDITIONAL_PROPERTIES_DEFAULTS,
  DETECT_ENUMS_DEFAULTS,
  EXTRACT_SUB_SCHEMAS_INTO_REFERENCES_DEFAULTS,
  SORT_SCHEMA_PROPERTIES_DEFAULTS,
} from '@/schema/refinement/refineSchemaTypes';
import type {
  RefineSchemaAllowedType,
  RefineSchemaSelection,
} from '@/schema/refinement/refineSchemaTypes';
import {runSchemaRefinement} from '@/schema/refinement/runSchemaRefinement';

const showDialog = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const inputSource = ref<'current' | 'files'>('files');
const selectedFile = ref<File | null>(null);

const enableSortSchemaPropertiesAlphabetically = ref(false);
const enableAddExamples = ref(false);
const enableDetectEnums = ref(false);
const enableDetectAdditionalProperties = ref(false);
const enableExtractSubSchemasIntoReferences = ref(false);

const addExamples = ref(createAddExamplesState());
const detectEnums = ref(createDetectEnumsState());
const detectAdditionalProperties = ref(createDetectAdditionalPropertiesState());

const allowedTypes: RefineSchemaAllowedType[] = ['string', 'integer', 'boolean'];
const currentDataLink = getDataForMode(SessionMode.DataEditor);
const fileDialog = createLazySingleFileDialog('.json');
const hasSelectedRefinements = computed(
  () =>
    enableSortSchemaPropertiesAlphabetically.value ||
    enableAddExamples.value ||
    enableDetectEnums.value ||
    enableDetectAdditionalProperties.value ||
    enableExtractSubSchemasIntoReferences.value
);
const hasCurrentData = computed(() => hasInferableCurrentData(currentDataLink.data.value));
const hasSelectedFile = computed(() => selectedFile.value !== null);
const usesCurrentDataSource = computed(() => inputSource.value === 'current');
const canInfer = computed(() => (usesCurrentDataSource.value ? hasCurrentData.value : hasSelectedFile.value));
const selectedFileName = computed(() => selectedFile.value?.name ?? '');
const inputSourceOptions = computed(() => [
  {label: 'Current data', value: 'current', disabled: !hasCurrentData.value},
  {label: 'Upload file', value: 'files'},
]);
const applyButtonLabel = computed(() =>
  hasSelectedRefinements.value ? 'Apply and Infer Schema' : 'Infer Schema'
);

function createAddExamplesState() {
  return {
    maxExamplesPerField: ADD_EXAMPLES_DEFAULTS.maxExamplesPerField,
    uniqueOnly: ADD_EXAMPLES_DEFAULTS.uniqueOnly,
    ignoreNullValues: ADD_EXAMPLES_DEFAULTS.ignoreNullValues,
  };
}

function createDetectEnumsState() {
  return {
    minObservedValues: DETECT_ENUMS_DEFAULTS.minObservedValues,
    minDuplicateRatio: DETECT_ENUMS_DEFAULTS.minDuplicateRatio,
    maxUniqueValues: DETECT_ENUMS_DEFAULTS.maxUniqueValues,
    allowedTypes: [...DETECT_ENUMS_DEFAULTS.allowedTypes],
  };
}

function createDetectAdditionalPropertiesState() {
  return {
    minProperties: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS.minProperties,
    similarityThreshold: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS.similarityThreshold,
    minMatchingSubProperties: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS.minMatchingSubProperties,
    requireSameValueType: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS.requireSameValueType,
  };
}

function resetDialog() {
  errorMessage.value = '';
  isLoading.value = false;
  inputSource.value = hasInferableCurrentData(currentDataLink.data.value) ? 'current' : 'files';
  selectedFile.value = null;
  enableSortSchemaPropertiesAlphabetically.value = false;
  enableAddExamples.value = false;
  enableDetectEnums.value = false;
  enableDetectAdditionalProperties.value = false;
  enableExtractSubSchemasIntoReferences.value = false;
  addExamples.value = createAddExamplesState();
  detectEnums.value = createDetectEnumsState();
  detectAdditionalProperties.value = createDetectAdditionalPropertiesState();
}

function openDialog() {
  resetDialog();
  showDialog.value = true;
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

function buildSelection(): RefineSchemaSelection {
  return {
    sortSchemaPropertiesAlphabetically: enableSortSchemaPropertiesAlphabetically.value
      ? SORT_SCHEMA_PROPERTIES_DEFAULTS
      : undefined,
    addExamples: enableAddExamples.value
      ? {
          maxExamplesPerField: addExamples.value.maxExamplesPerField,
          uniqueOnly: addExamples.value.uniqueOnly,
          ignoreNullValues: addExamples.value.ignoreNullValues,
        }
      : undefined,
    detectEnums: enableDetectEnums.value
      ? {
          minObservedValues: detectEnums.value.minObservedValues,
          minDuplicateRatio: detectEnums.value.minDuplicateRatio,
          maxUniqueValues: detectEnums.value.maxUniqueValues,
          allowedTypes: [...detectEnums.value.allowedTypes],
        }
      : undefined,
    detectAdditionalProperties: enableDetectAdditionalProperties.value
      ? {
          minProperties: detectAdditionalProperties.value.minProperties,
          similarityThreshold: detectAdditionalProperties.value.similarityThreshold,
          minMatchingSubProperties: detectAdditionalProperties.value.minMatchingSubProperties,
          requireSameValueType: detectAdditionalProperties.value.requireSameValueType,
        }
      : undefined,
    extractSubSchemasIntoReferences: enableExtractSubSchemasIntoReferences.value
      ? EXTRACT_SUB_SCHEMAS_INTO_REFERENCES_DEFAULTS
      : undefined,
  };
}

async function inferSchemaAndApplyRefinements() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    let schema: TopLevelSchema;
    let successDetail: string;

    if (usesCurrentDataSource.value) {
      const currentData = currentDataLink.data.value;

      if (!hasInferableCurrentData(currentData)) {
        errorMessage.value = 'Please load data into the Data Editor first.';
        return;
      }

      schema = inferJsonSchema(currentData) as TopLevelSchema;

      if (hasSelectedRefinements.value) {
        schema = runSchemaRefinement(schema, currentData, buildSelection());
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

      if (hasSelectedRefinements.value) {
        schema = runSchemaRefinement(schema, instance, buildSelection());
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

            <p class="file-picker-description">
              Select exactly one JSON file to use as input.
            </p>

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

      <div class="refinement-list">
        <Panel class="refinement-panel">
          <template #header>
            <div class="refinement-title-row">
              <Checkbox
                v-model="enableSortSchemaPropertiesAlphabetically"
                binary
                input-id="infer-sort-schema-properties-alphabetically" />
              <label
                class="refinement-title"
                for="infer-sort-schema-properties-alphabetically">
                Sort Schema Properties Alphabetically
              </label>
            </div>
          </template>

          <p class="refinement-description">
            Sort schema keys recursively, including <code>properties</code>,
            <code>patternProperties</code>, <code>dependentSchemas</code>, and
            <code>$defs</code>.
          </p>
        </Panel>

        <Panel class="refinement-panel">
          <template #header>
            <div class="refinement-title-row">
              <Checkbox v-model="enableAddExamples" binary input-id="infer-add-examples" />
              <label class="refinement-title" for="infer-add-examples">Add Examples</label>
            </div>
          </template>

          <p class="refinement-description">
            Add real example values from the selected data instances to matching schema fields.
          </p>

          <div v-if="enableAddExamples" class="parameter-grid">
            <div class="parameter-field">
              <label for="infer-add-examples-max">Max examples per field</label>
              <InputNumber
                input-id="infer-add-examples-max"
                v-model="addExamples.maxExamplesPerField"
                :min="1"
                :max="50"
                :use-grouping="false" />
            </div>

            <div class="parameter-checkbox">
              <Checkbox v-model="addExamples.uniqueOnly" binary input-id="infer-add-examples-unique" />
              <label for="infer-add-examples-unique">Only unique examples</label>
            </div>

            <div class="parameter-checkbox">
              <Checkbox
                v-model="addExamples.ignoreNullValues"
                binary
                input-id="infer-add-examples-ignore-null" />
              <label for="infer-add-examples-ignore-null">Ignore null values</label>
            </div>
          </div>
        </Panel>

        <Panel class="refinement-panel">
          <template #header>
            <div class="refinement-title-row">
              <Checkbox v-model="enableDetectEnums" binary input-id="infer-detect-enums" />
              <label class="refinement-title" for="infer-detect-enums">Detect Enums</label>
            </div>
          </template>

          <p class="refinement-description">
            Detect fields with a small repeating value set and turn them into schema enums.
          </p>

          <div v-if="enableDetectEnums" class="parameter-grid">
            <div class="parameter-field">
              <label for="infer-detect-enums-min-observed">Minimum observed values</label>
              <InputNumber
                input-id="infer-detect-enums-min-observed"
                v-model="detectEnums.minObservedValues"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="infer-detect-enums-duplicate-ratio">Minimum duplicate ratio</label>
              <InputNumber
                input-id="infer-detect-enums-duplicate-ratio"
                v-model="detectEnums.minDuplicateRatio"
                :min="0"
                :max="1"
                :step="0.05"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="infer-detect-enums-max-unique">Maximum unique values</label>
              <InputNumber
                input-id="infer-detect-enums-max-unique"
                v-model="detectEnums.maxUniqueValues"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-types">
              <span class="parameter-label">Allowed types</span>
              <div class="type-checkbox-list">
                <div
                  v-for="allowedType in allowedTypes"
                  :key="allowedType"
                  class="parameter-checkbox">
                  <Checkbox
                    v-model="detectEnums.allowedTypes"
                    :input-id="`infer-detect-enums-${allowedType}`"
                    :value="allowedType" />
                  <label :for="`infer-detect-enums-${allowedType}`">{{ allowedType }}</label>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel class="refinement-panel">
          <template #header>
            <div class="refinement-title-row">
              <Checkbox
                v-model="enableDetectAdditionalProperties"
                binary
                input-id="infer-detect-additional-properties" />
              <label class="refinement-title" for="infer-detect-additional-properties">
                Detect Additional Properties
              </label>
            </div>
          </template>

          <p class="refinement-description">
            Detect dynamic object keys that should be represented through
            <code>additionalProperties</code>.
          </p>

          <div v-if="enableDetectAdditionalProperties" class="parameter-grid">
            <div class="parameter-field">
              <label for="infer-detect-additional-min-properties">Minimum number of properties</label>
              <InputNumber
                input-id="infer-detect-additional-min-properties"
                v-model="detectAdditionalProperties.minProperties"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="infer-detect-additional-similarity">Similarity threshold</label>
              <InputNumber
                input-id="infer-detect-additional-similarity"
                v-model="detectAdditionalProperties.similarityThreshold"
                :min="0"
                :max="1"
                :step="0.05"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="infer-detect-additional-min-matching">
                Minimum matching properties in subschema
              </label>
              <InputNumber
                input-id="infer-detect-additional-min-matching"
                v-model="detectAdditionalProperties.minMatchingSubProperties"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-checkbox">
              <Checkbox
                v-model="detectAdditionalProperties.requireSameValueType"
                binary
                input-id="infer-detect-additional-same-type" />
              <label for="infer-detect-additional-same-type">Require same value type</label>
            </div>
          </div>
        </Panel>

        <Panel class="refinement-panel">
          <template #header>
            <div class="refinement-title-row">
              <Checkbox
                v-model="enableExtractSubSchemasIntoReferences"
                binary
                input-id="infer-extract-sub-schemas-into-references" />
              <label
                class="refinement-title"
                for="infer-extract-sub-schemas-into-references">
                Extract Sub-schemas into References
              </label>
            </div>
          </template>

          <p class="refinement-description">
            Move inlined object and enum sub-schemas into <code>$defs</code> and replace them with
            shared <code>$ref</code> references.
          </p>
        </Panel>
      </div>

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

.selected-files-list {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--text-color-secondary);
}

.selected-file-name {
  color: var(--text-color-secondary);
  padding-left: 0.1rem;
}

.refinement-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.refinement-panel {
  overflow: hidden;
}

.refinement-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.refinement-title {
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.refinement-description {
  margin: 0;
  color: var(--text-color-secondary);
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--surface-border);
}

.parameter-field,
.parameter-types {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.parameter-checkbox {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.parameter-label {
  font-weight: 600;
}

.type-checkbox-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
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
