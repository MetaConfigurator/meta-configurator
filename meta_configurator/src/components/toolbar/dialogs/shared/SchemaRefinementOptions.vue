<script setup lang="ts">
import {computed, ref} from 'vue';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import Panel from 'primevue/panel';
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
import type {SchemaRefinementOptionsController} from '@/schema/refinement/schemaRefinementOptionsController';

const props = withDefaults(
  defineProps<{
    idPrefix: string;
    addExamplesDescription?: string;
  }>(),
  {
    addExamplesDescription:
      'Add real example values from the current input data to matching schema fields.',
  }
);

const enableSortSchemaPropertiesAlphabetically = ref(false);
const enableAddExamples = ref(false);
const enableDetectEnums = ref(false);
const enableDetectAdditionalProperties = ref(false);
const enableExtractSubSchemasIntoReferences = ref(false);

const addExamples = ref(createAddExamplesState());
const detectEnums = ref(createDetectEnumsState());
const detectAdditionalProperties = ref(createDetectAdditionalPropertiesState());

const hasSelectedRefinementsState = computed(
  () =>
    enableSortSchemaPropertiesAlphabetically.value ||
    enableAddExamples.value ||
    enableDetectEnums.value ||
    enableDetectAdditionalProperties.value ||
    enableExtractSubSchemasIntoReferences.value
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
    minMatchingSubProperties: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS.minMatchingSubProperties,
    requireSameValueType: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS.requireSameValueType,
  };
}

function fieldId(suffix: string): string {
  return `${props.idPrefix}-${suffix}`;
}

function reset() {
  enableSortSchemaPropertiesAlphabetically.value = false;
  enableAddExamples.value = false;
  enableDetectEnums.value = false;
  enableDetectAdditionalProperties.value = false;
  enableExtractSubSchemasIntoReferences.value = false;

  addExamples.value = createAddExamplesState();
  detectEnums.value = createDetectEnumsState();
  detectAdditionalProperties.value = createDetectAdditionalPropertiesState();
}

function hasSelectedRefinements(): boolean {
  return hasSelectedRefinementsState.value;
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

reset();

defineExpose<SchemaRefinementOptionsController>({
  reset,
  hasSelectedRefinements,
  buildSelection,
});
</script>

<template>
  <div class="refinement-list">
    <Panel class="refinement-panel">
      <template #header>
        <div class="refinement-title-row">
          <Checkbox
            v-model="enableSortSchemaPropertiesAlphabetically"
            binary
            :input-id="fieldId('sort-schema-properties-alphabetically')" />
          <label class="refinement-title" :for="fieldId('sort-schema-properties-alphabetically')">
            Sort Schema Properties Alphabetically
          </label>
        </div>
      </template>

      <p class="refinement-description">
        Sort schema keys recursively, including <code>properties</code>,
        <code>patternProperties</code>, <code>dependentSchemas</code>, and <code>$defs</code>.
      </p>
    </Panel>

    <Panel class="refinement-panel">
      <template #header>
        <div class="refinement-title-row">
          <Checkbox v-model="enableAddExamples" binary :input-id="fieldId('add-examples')" />
          <label class="refinement-title" :for="fieldId('add-examples')">Add Examples</label>
        </div>
      </template>

      <p class="refinement-description">
        {{ addExamplesDescription }}
      </p>

      <div v-if="enableAddExamples" class="parameter-grid">
        <div class="parameter-field">
          <label :for="fieldId('add-examples-max')">Max examples per field</label>
          <InputNumber
            :input-id="fieldId('add-examples-max')"
            v-model="addExamples.maxExamplesPerField"
            :min="1"
            :max="50"
            :use-grouping="false" />
        </div>

        <div class="parameter-checkbox">
          <Checkbox
            v-model="addExamples.uniqueOnly"
            binary
            :input-id="fieldId('add-examples-unique')" />
          <label :for="fieldId('add-examples-unique')">Only unique examples</label>
        </div>

        <div class="parameter-checkbox">
          <Checkbox
            v-model="addExamples.ignoreNullValues"
            binary
            :input-id="fieldId('add-examples-ignore-null')" />
          <label :for="fieldId('add-examples-ignore-null')">Ignore null values</label>
        </div>
      </div>
    </Panel>

    <Panel class="refinement-panel">
      <template #header>
        <div class="refinement-title-row">
          <Checkbox v-model="enableDetectEnums" binary :input-id="fieldId('detect-enums')" />
          <label class="refinement-title" :for="fieldId('detect-enums')">Detect Enums</label>
        </div>
      </template>

      <p class="refinement-description">
        Detect fields with a small repeating value set and turn them into schema enums.
      </p>

      <div v-if="enableDetectEnums" class="parameter-grid">
        <div class="parameter-field">
          <label :for="fieldId('detect-enums-min-observed')">Minimum observed values</label>
          <InputNumber
            :input-id="fieldId('detect-enums-min-observed')"
            v-model="detectEnums.minObservedValues"
            :min="1"
            :max="1000"
            :use-grouping="false" />
        </div>

        <div class="parameter-field">
          <label :for="fieldId('detect-enums-duplicate-ratio')">Minimum duplicate ratio</label>
          <InputNumber
            :input-id="fieldId('detect-enums-duplicate-ratio')"
            v-model="detectEnums.minDuplicateRatio"
            :min="0"
            :max="1"
            :step="0.05"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            :use-grouping="false" />
        </div>

        <div class="parameter-field">
          <label :for="fieldId('detect-enums-max-unique')">Maximum unique values</label>
          <InputNumber
            :input-id="fieldId('detect-enums-max-unique')"
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
                :input-id="fieldId(`detect-enums-${allowedType}`)"
                :value="allowedType" />
              <label :for="fieldId(`detect-enums-${allowedType}`)">{{ allowedType }}</label>
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
            :input-id="fieldId('detect-additional-properties')" />
          <label class="refinement-title" :for="fieldId('detect-additional-properties')">
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
          <label :for="fieldId('detect-additional-min-properties')">
            Minimum number of properties
          </label>
          <InputNumber
            :input-id="fieldId('detect-additional-min-properties')"
            v-model="detectAdditionalProperties.minProperties"
            :min="1"
            :max="1000"
            :use-grouping="false" />
        </div>

        <div class="parameter-field">
          <label :for="fieldId('detect-additional-similarity')">Similarity threshold</label>
          <InputNumber
            :input-id="fieldId('detect-additional-similarity')"
            v-model="detectAdditionalProperties.similarityThreshold"
            :min="0"
            :max="1"
            :step="0.05"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            :use-grouping="false" />
        </div>

        <div class="parameter-field">
          <label :for="fieldId('detect-additional-min-matching')">
            Minimum matching properties in subschema
          </label>
          <InputNumber
            :input-id="fieldId('detect-additional-min-matching')"
            v-model="detectAdditionalProperties.minMatchingSubProperties"
            :min="1"
            :max="1000"
            :use-grouping="false" />
        </div>

        <div class="parameter-checkbox">
          <Checkbox
            v-model="detectAdditionalProperties.requireSameValueType"
            binary
            :input-id="fieldId('detect-additional-same-type')" />
          <label :for="fieldId('detect-additional-same-type')">Require same value type</label>
        </div>
      </div>
    </Panel>

    <Panel class="refinement-panel">
      <template #header>
        <div class="refinement-title-row">
          <Checkbox
            v-model="enableExtractSubSchemasIntoReferences"
            binary
            :input-id="fieldId('extract-sub-schemas-into-references')" />
          <label class="refinement-title" :for="fieldId('extract-sub-schemas-into-references')">
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
</template>

<style scoped>
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
  gap: 0.6rem;
}

.parameter-label {
  font-weight: 600;
}

.type-checkbox-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}
</style>
