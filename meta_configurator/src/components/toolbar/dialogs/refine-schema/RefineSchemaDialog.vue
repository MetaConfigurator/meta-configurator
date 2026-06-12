<script setup lang="ts">
import {computed, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import {
  ADD_EXAMPLES_DEFAULTS,
  DETECT_ADDITIONAL_PROPERTIES_DEFAULTS,
  DETECT_ENUMS_DEFAULTS,
  DETECT_PATTERN_PROPERTIES_DEFAULTS,
} from '@/schema/refinement/refineSchemaTypes';
import type {
  RefineSchemaAllowedType,
  RefineSchemaSelection,
} from '@/schema/refinement/refineSchemaTypes';
import {
  applySchemaRefinements,
} from '@/components/toolbar/refineSchema';

const showDialog = ref(false);

const enableAddExamples = ref(false);
const enableDetectEnums = ref(false);
const enableDetectAdditionalProperties = ref(false);
const enableDetectPatternProperties = ref(false);

const addExamples = ref(createAddExamplesState());
const detectEnums = ref(createDetectEnumsState());
const detectAdditionalProperties = ref(createDetectAdditionalPropertiesState());
const detectPatternProperties = ref(createDetectPatternPropertiesState());

const hasSelectedRefinements = computed(
  () =>
    enableAddExamples.value ||
    enableDetectEnums.value ||
    enableDetectAdditionalProperties.value ||
    enableDetectPatternProperties.value
);

const allowedTypes: RefineSchemaAllowedType[] = ['string', 'integer', 'boolean'];

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
    minMatchingSubProperties:
      DETECT_ADDITIONAL_PROPERTIES_DEFAULTS.minMatchingSubProperties,
    requireSameValueType: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS.requireSameValueType,
  };
}

function createDetectPatternPropertiesState() {
  return {
    minMatchingKeys: DETECT_PATTERN_PROPERTIES_DEFAULTS.minMatchingKeys,
    requireCommonPrefix: DETECT_PATTERN_PROPERTIES_DEFAULTS.requireCommonPrefix,
    requireNumericSuffix: DETECT_PATTERN_PROPERTIES_DEFAULTS.requireNumericSuffix,
    similarityThreshold: DETECT_PATTERN_PROPERTIES_DEFAULTS.similarityThreshold,
  };
}

function resetDialog() {
  enableAddExamples.value = false;
  enableDetectEnums.value = false;
  enableDetectAdditionalProperties.value = false;
  enableDetectPatternProperties.value = false;

  addExamples.value = createAddExamplesState();
  detectEnums.value = createDetectEnumsState();
  detectAdditionalProperties.value = createDetectAdditionalPropertiesState();
  detectPatternProperties.value = createDetectPatternPropertiesState();
}

function openDialog() {
  resetDialog();
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function buildSelection(): RefineSchemaSelection {
  return {
    addExamples: enableAddExamples.value ? createAddExamplesStateFromCurrent() : undefined,
    detectEnums: enableDetectEnums.value ? createDetectEnumsStateFromCurrent() : undefined,
    detectAdditionalProperties: enableDetectAdditionalProperties.value
      ? createDetectAdditionalPropertiesStateFromCurrent()
      : undefined,
    detectPatternProperties: enableDetectPatternProperties.value
      ? createDetectPatternPropertiesStateFromCurrent()
      : undefined,
  };
}

function createAddExamplesStateFromCurrent() {
  return {
    maxExamplesPerField: addExamples.value.maxExamplesPerField,
    uniqueOnly: addExamples.value.uniqueOnly,
    ignoreNullValues: addExamples.value.ignoreNullValues,
  };
}

function createDetectEnumsStateFromCurrent() {
  return {
    minObservedValues: detectEnums.value.minObservedValues,
    minDuplicateRatio: detectEnums.value.minDuplicateRatio,
    maxUniqueValues: detectEnums.value.maxUniqueValues,
    allowedTypes: [...detectEnums.value.allowedTypes],
  };
}

function createDetectAdditionalPropertiesStateFromCurrent() {
  return {
    minProperties: detectAdditionalProperties.value.minProperties,
    similarityThreshold: detectAdditionalProperties.value.similarityThreshold,
    minMatchingSubProperties: detectAdditionalProperties.value.minMatchingSubProperties,
    requireSameValueType: detectAdditionalProperties.value.requireSameValueType,
  };
}

function createDetectPatternPropertiesStateFromCurrent() {
  return {
    minMatchingKeys: detectPatternProperties.value.minMatchingKeys,
    requireCommonPrefix: detectPatternProperties.value.requireCommonPrefix,
    requireNumericSuffix: detectPatternProperties.value.requireNumericSuffix,
    similarityThreshold: detectPatternProperties.value.similarityThreshold,
  };
}

function applySelectedRefinements() {
  if (!hasSelectedRefinements.value) {
    return;
  }

  const appliedSuccessfully = applySchemaRefinements(buildSelection());
  if (appliedSuccessfully) {
    hideDialog();
  }
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Refine Schema"
    :modal="true"
    :style="{width: '50rem', maxWidth: '95vw'}">
    <div class="dialog-content">
      <Message severity="info">
        Select one or more refinement steps. As soon as you enable a step, its parameters appear
        with useful default values.
      </Message>

      <div class="refinement-list">
        <Panel class="refinement-panel">
          <template #header>
            <div class="refinement-title-row">
              <Checkbox v-model="enableAddExamples" binary input-id="refine-add-examples" />
              <label class="refinement-title" for="refine-add-examples">Add Examples</label>
            </div>
          </template>

          <p class="refinement-description">
            Add real example values from the current input data to matching schema fields.
          </p>

          <div v-if="enableAddExamples" class="parameter-grid">
            <div class="parameter-field">
              <label for="add-examples-max">Max examples per field</label>
              <InputNumber
                input-id="add-examples-max"
                v-model="addExamples.maxExamplesPerField"
                :min="1"
                :max="50"
                :use-grouping="false" />
            </div>

            <div class="parameter-checkbox">
              <Checkbox
                v-model="addExamples.uniqueOnly"
                binary
                input-id="add-examples-unique" />
              <label for="add-examples-unique">Only unique examples</label>
            </div>

            <div class="parameter-checkbox">
              <Checkbox
                v-model="addExamples.ignoreNullValues"
                binary
                input-id="add-examples-ignore-null" />
              <label for="add-examples-ignore-null">Ignore null values</label>
            </div>
          </div>
        </Panel>

        <Panel class="refinement-panel">
          <template #header>
            <div class="refinement-title-row">
              <Checkbox v-model="enableDetectEnums" binary input-id="refine-detect-enums" />
              <label class="refinement-title" for="refine-detect-enums">Detect Enums</label>
            </div>
          </template>

          <p class="refinement-description">
            Detect fields with a small repeating value set and turn them into schema enums.
          </p>

          <div v-if="enableDetectEnums" class="parameter-grid">
            <div class="parameter-field">
              <label for="detect-enums-min-observed">Minimum observed values</label>
              <InputNumber
                input-id="detect-enums-min-observed"
                v-model="detectEnums.minObservedValues"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="detect-enums-duplicate-ratio">Minimum duplicate ratio</label>
              <InputNumber
                input-id="detect-enums-duplicate-ratio"
                v-model="detectEnums.minDuplicateRatio"
                :min="0"
                :max="1"
                :step="0.05"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="detect-enums-max-unique">Maximum unique values</label>
              <InputNumber
                input-id="detect-enums-max-unique"
                v-model="detectEnums.maxUniqueValues"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-types">
              <span class="parameter-label">Allowed types</span>
              <div class="type-checkbox-list">
                <div v-for="allowedType in allowedTypes" :key="allowedType" class="parameter-checkbox">
                  <Checkbox
                    v-model="detectEnums.allowedTypes"
                    :input-id="`detect-enums-${allowedType}`"
                    :value="allowedType" />
                  <label :for="`detect-enums-${allowedType}`">{{ allowedType }}</label>
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
                input-id="refine-detect-additional-properties" />
              <label class="refinement-title" for="refine-detect-additional-properties">
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
              <label for="detect-additional-min-properties">Minimum number of properties</label>
              <InputNumber
                input-id="detect-additional-min-properties"
                v-model="detectAdditionalProperties.minProperties"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="detect-additional-similarity">Similarity threshold</label>
              <InputNumber
                input-id="detect-additional-similarity"
                v-model="detectAdditionalProperties.similarityThreshold"
                :min="0"
                :max="1"
                :step="0.05"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="detect-additional-min-matching">
                Minimum matching properties in subschema
              </label>
              <InputNumber
                input-id="detect-additional-min-matching"
                v-model="detectAdditionalProperties.minMatchingSubProperties"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-checkbox">
              <Checkbox
                v-model="detectAdditionalProperties.requireSameValueType"
                binary
                input-id="detect-additional-same-type" />
              <label for="detect-additional-same-type">Require same value type</label>
            </div>
          </div>
        </Panel>

        <Panel class="refinement-panel">
          <template #header>
            <div class="refinement-title-row">
              <Checkbox
                v-model="enableDetectPatternProperties"
                binary
                input-id="refine-detect-pattern-properties" />
              <label class="refinement-title" for="refine-detect-pattern-properties">
                Detect Pattern Properties
              </label>
            </div>
          </template>

          <p class="refinement-description">
            Detect key naming patterns and convert them into
            <code>patternProperties</code> rules.
          </p>

          <div v-if="enableDetectPatternProperties" class="parameter-grid">
            <div class="parameter-field">
              <label for="detect-pattern-min-keys">Minimum number of matching keys</label>
              <InputNumber
                input-id="detect-pattern-min-keys"
                v-model="detectPatternProperties.minMatchingKeys"
                :min="1"
                :max="1000"
                :use-grouping="false" />
            </div>

            <div class="parameter-field">
              <label for="detect-pattern-similarity">Similarity threshold</label>
              <InputNumber
                input-id="detect-pattern-similarity"
                v-model="detectPatternProperties.similarityThreshold"
                :min="0"
                :max="1"
                :step="0.05"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                :use-grouping="false" />
            </div>

            <div class="parameter-checkbox">
              <Checkbox
                v-model="detectPatternProperties.requireCommonPrefix"
                binary
                input-id="detect-pattern-common-prefix" />
              <label for="detect-pattern-common-prefix">Require common prefix</label>
            </div>

            <div class="parameter-checkbox">
              <Checkbox
                v-model="detectPatternProperties.requireNumericSuffix"
                binary
                input-id="detect-pattern-numeric-suffix" />
              <label for="detect-pattern-numeric-suffix">Require numeric suffix</label>
            </div>
          </div>
        </Panel>
      </div>

      <div class="dialog-actions">
        <Button label="Cancel" severity="secondary" text @click="hideDialog" />
        <Button
          label="Apply"
          icon="pi pi-check"
          @click="applySelectedRefinements"
          :disabled="!hasSelectedRefinements" />
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
  gap: 0.65rem;
  min-height: 2.75rem;
}

.parameter-label,
.parameter-field label {
  font-size: 0.92rem;
  font-weight: 600;
}

.type-checkbox-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

code {
  font-size: 0.9em;
}

:deep(.refinement-panel .p-panel-header) {
  padding: 1rem;
}

:deep(.refinement-panel .p-panel-content) {
  padding: 1rem;
}
</style>
