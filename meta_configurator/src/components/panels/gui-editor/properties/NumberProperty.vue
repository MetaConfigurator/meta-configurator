<!-- Numeric input for number and integer properties -->
<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import {computed, ref, watch} from 'vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {generatePlaceholderText} from '@/utility/propertyPlaceholderGenerator';
import type {ValidationResult} from '@/schema/validationUtils';
import type {PathElement} from '@/utility/path';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: number | undefined;
  propertySchema: JsonSchemaWrapper;
  validationResults: ValidationResult;
}>();

const settings = useSettings();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: number | undefined): void;
}>();

const inputValue = ref(formatNumberForDisplay(props.propertyData));

watch(
  () => props.propertyData,
  newValue => {
    if (parseNumber(inputValue.value) !== newValue) {
      inputValue.value = formatNumberForDisplay(newValue);
    }
  }
);

function isValid(): boolean {
  return props.validationResults.valid && isValidNumberInput(inputValue.value);
}

function isInteger(): boolean {
  return props.propertySchema.hasType('integer');
}

const stepValue = computed(() => {
  return props.propertySchema.multipleOf ?? 1;
});

function formatNumberForDisplay(value: number | undefined): string {
  if (value === undefined) {
    return '';
  }
  if (shouldUseScientificNotation(value)) {
    return value.toExponential();
  }
  return expandScientificNotation(String(value));
}

function shouldUseScientificNotation(value: number): boolean {
  if (!settings.value.guiEditor.useScientificNotationForLargeAndSmallNumbers || value === 0) {
    return false;
  }

  const absoluteValue = Math.abs(value);
  return (
    absoluteValue >= settings.value.guiEditor.scientificNotationUpperThreshold ||
    absoluteValue <= settings.value.guiEditor.scientificNotationLowerThreshold
  );
}

function expandScientificNotation(value: string): string {
  if (!/[eE]/.test(value)) {
    return value;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return value;
  }
  return numberValue.toLocaleString('en-US', {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
}

function parseNumber(value: string): number | undefined {
  if (!/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
    return undefined;
  }
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return undefined;
  }
  return parsedValue;
}

function isValidNumberInput(value: string): boolean {
  if (value === '') {
    return true;
  }
  const parsedValue = parseNumber(value);
  return parsedValue !== undefined && (!isInteger() || Number.isInteger(parsedValue));
}

function isAllowedPartialNumberInput(value: string): boolean {
  return /^-?(0|[1-9]\d*)?(\.\d*)?([eE][+-]?\d*)?$/.test(value);
}

function onBeforeInput(event: InputEvent) {
  if (
    event.inputType.startsWith('delete') ||
    event.inputType === 'historyUndo' ||
    event.inputType === 'historyRedo'
  ) {
    return;
  }

  const inputElement = event.target as HTMLInputElement;
  const selectionStart = inputElement.selectionStart ?? inputElement.value.length;
  const selectionEnd = inputElement.selectionEnd ?? inputElement.value.length;
  const nextValue =
    inputElement.value.slice(0, selectionStart) +
    (event.data ?? '') +
    inputElement.value.slice(selectionEnd);

  if (!isAllowedPartialNumberInput(nextValue)) {
    event.preventDefault();
  }
}

function updateInputValue(value: string) {
  if (!isAllowedPartialNumberInput(value)) {
    return;
  }

  inputValue.value = value;
  const parsedValue = parseNumber(value);
  if (parsedValue !== undefined && (!isInteger() || Number.isInteger(parsedValue))) {
    emit('update:propertyData', parsedValue);
  }
}

function step(direction: 1 | -1) {
  if (isReadOnly(props.propertySchema)) {
    return;
  }

  const currentValue = parseNumber(inputValue.value) ?? props.propertyData ?? 0;
  const newValue = currentValue + direction * stepValue.value;
  if (Number.isInteger(newValue)) {
    inputValue.value = formatNumberForDisplay(newValue);
    emit('update:propertyData', newValue);
  }
}
</script>

<template>
  <div class="number-input-wrapper">
    <InputText
      class="number-input h-8"
      :class="{'underline decoration-wavy decoration-red-600': !isValid()}"
      :model-value="inputValue"
      :placeholder="generatePlaceholderText(props.propertySchema, props.propertyName)"
      :disabled="isReadOnly(props.propertySchema)"
      inputmode="decimal"
      @beforeinput="onBeforeInput"
      @update:model-value="value => updateInputValue(value ?? '')"
      @keydown.down.stop
      @keydown.up.stop
      @keydown.left.stop
      @keydown.right.stop />
    <div v-if="isInteger()" class="integer-step-buttons">
      <Button
        text
        severity="secondary"
        class="integer-step-button"
        :disabled="isReadOnly(props.propertySchema)"
        @click="step(1)">
        <i class="pi pi-chevron-up" />
      </Button>
      <Button
        text
        severity="secondary"
        class="integer-step-button"
        :disabled="isReadOnly(props.propertySchema)"
        @click="step(-1)">
        <i class="pi pi-chevron-down" />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.number-input-wrapper {
  display: flex;
  align-items: center;
}

.number-input {
  min-width: 0;
  box-shadow: none !important;
  border: v-bind(
    "settings.guiEditor.showBorderAroundInputFields ? '1px solid #d1d5db' : 'none'"
  ) !important;
}

.integer-step-buttons {
  display: flex;
  flex-direction: column;
  height: 2rem;
}

.integer-step-button {
  width: 1.5rem;
  min-width: 1.5rem;
  height: 1rem;
  padding: 0 !important;
  color: var(--p-text-muted-color);
}

.integer-step-button :deep(.pi) {
  font-size: 0.6rem;
}

::placeholder {
  color: #a8a8a8;
}
</style>
