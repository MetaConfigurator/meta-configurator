<script setup lang="ts">
import {ref} from 'vue';
import {cloneDeep} from 'lodash';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import RefinementOptionPanel from '@/components/toolbar/dialogs/shared/RefinementOptionPanel.vue';
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
    /**
     * Whether to offer the steps that only restructure the schema itself. Dialogs that
     * refine a schema against data hide them, because the schema menu offers them
     * separately for the schema that is loaded in the editor.
     */
    showDataIndependentSteps?: boolean;
  }>(),
  {
    addExamplesDescription:
      'Add real example values from the current input data to matching schema fields.',
    showDataIndependentSteps: true,
  }
);

const selectableEnumTypes: RefineSchemaAllowedType[] = ['string', 'integer', 'boolean'];

const enableSortSchemaPropertiesAlphabetically = ref(false);
const enableAddExamples = ref(false);
const enableDetectEnums = ref(false);
const enableDetectAdditionalProperties = ref(false);
const enableExtractSubSchemasIntoReferences = ref(false);

const addExamples = ref(cloneDeep(ADD_EXAMPLES_DEFAULTS));
const detectEnums = ref(cloneDeep(DETECT_ENUMS_DEFAULTS));
const detectAdditionalProperties = ref(cloneDeep(DETECT_ADDITIONAL_PROPERTIES_DEFAULTS));

function fieldId(suffix: string): string {
  return `${props.idPrefix}-${suffix}`;
}

function reset() {
  enableSortSchemaPropertiesAlphabetically.value = false;
  enableAddExamples.value = false;
  enableDetectEnums.value = false;
  enableDetectAdditionalProperties.value = false;
  enableExtractSubSchemasIntoReferences.value = false;

  addExamples.value = cloneDeep(ADD_EXAMPLES_DEFAULTS);
  detectEnums.value = cloneDeep(DETECT_ENUMS_DEFAULTS);
  detectAdditionalProperties.value = cloneDeep(DETECT_ADDITIONAL_PROPERTIES_DEFAULTS);
}

function hasSelectedRefinements(): boolean {
  return (
    isDataIndependentStepSelected(enableSortSchemaPropertiesAlphabetically.value) ||
    enableAddExamples.value ||
    enableDetectEnums.value ||
    enableDetectAdditionalProperties.value ||
    isDataIndependentStepSelected(enableExtractSubSchemasIntoReferences.value)
  );
}

/** Hidden steps never contribute a selection, even if they were enabled before. */
function isDataIndependentStepSelected(isEnabled: boolean): boolean {
  return props.showDataIndependentSteps && isEnabled;
}

function buildSelection(): RefineSchemaSelection {
  return {
    sortSchemaPropertiesAlphabetically: isDataIndependentStepSelected(
      enableSortSchemaPropertiesAlphabetically.value
    )
      ? cloneDeep(SORT_SCHEMA_PROPERTIES_DEFAULTS)
      : undefined,
    addExamples: enableAddExamples.value ? cloneDeep(addExamples.value) : undefined,
    detectEnums: enableDetectEnums.value ? cloneDeep(detectEnums.value) : undefined,
    detectAdditionalProperties: enableDetectAdditionalProperties.value
      ? cloneDeep(detectAdditionalProperties.value)
      : undefined,
    extractSubSchemasIntoReferences: isDataIndependentStepSelected(
      enableExtractSubSchemasIntoReferences.value
    )
      ? cloneDeep(EXTRACT_SUB_SCHEMAS_INTO_REFERENCES_DEFAULTS)
      : undefined,
  };
}

defineExpose<SchemaRefinementOptionsController>({
  reset,
  hasSelectedRefinements,
  buildSelection,
});
</script>

<template>
  <div class="refinement-list">
    <RefinementOptionPanel
      v-if="showDataIndependentSteps"
      v-model:enabled="enableSortSchemaPropertiesAlphabetically"
      title="Sort Schema Properties Alphabetically"
      :input-id="fieldId('sort-schema-properties-alphabetically')">
      Sort schema keys recursively, including <code>properties</code>,
      <code>patternProperties</code>, <code>dependentSchemas</code>, and <code>$defs</code>.
    </RefinementOptionPanel>

    <RefinementOptionPanel
      v-model:enabled="enableAddExamples"
      title="Add Examples"
      :input-id="fieldId('add-examples')">
      {{ addExamplesDescription }}

      <template #parameters>
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
      </template>
    </RefinementOptionPanel>

    <RefinementOptionPanel
      v-model:enabled="enableDetectEnums"
      title="Detect Enums"
      :input-id="fieldId('detect-enums')">
      Detect fields with a small repeating value set and turn them into schema enums.

      <template #parameters>
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
            <div
              v-for="allowedType in selectableEnumTypes"
              :key="allowedType"
              class="parameter-checkbox">
              <Checkbox
                v-model="detectEnums.allowedTypes"
                :input-id="fieldId(`detect-enums-${allowedType}`)"
                :value="allowedType" />
              <label :for="fieldId(`detect-enums-${allowedType}`)">{{ allowedType }}</label>
            </div>
          </div>
        </div>
      </template>
    </RefinementOptionPanel>

    <RefinementOptionPanel
      v-model:enabled="enableDetectAdditionalProperties"
      title="Detect Additional Properties"
      :input-id="fieldId('detect-additional-properties')">
      Detect dynamic object keys that should be represented through
      <code>additionalProperties</code>.

      <template #parameters>
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
      </template>
    </RefinementOptionPanel>

    <RefinementOptionPanel
      v-if="showDataIndependentSteps"
      v-model:enabled="enableExtractSubSchemasIntoReferences"
      title="Extract Sub-schemas into References"
      :input-id="fieldId('extract-sub-schemas-into-references')">
      Move inlined object and enum sub-schemas into <code>$defs</code> and replace them with shared
      <code>$ref</code> references.
    </RefinementOptionPanel>
  </div>
</template>

<style scoped>
.refinement-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
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

label {
  font-size: 0.9rem;
}
</style>
