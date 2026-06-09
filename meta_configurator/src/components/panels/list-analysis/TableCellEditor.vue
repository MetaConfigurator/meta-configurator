<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import {getDataForMode, getValidationForMode} from '@/data/useDataLink';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {Path} from '@/utility/path';
import type {SessionMode} from '@/store/sessionMode';

const props = defineProps<{
  value: any;
  schema: JsonSchemaWrapper;
  absolutePath: Path;
  sessionMode: SessionMode;
}>();

const isFocused = ref(false);
const internalValue = ref(props.value);

watch(
  () => props.value,
  newValue => {
    if (!isFocused.value) {
      internalValue.value = newValue;
    }
  }
);

const validationResults = computed(() => {
  return getValidationForMode(props.sessionMode)
    .currentValidationResult.value.filterForPath(props.absolutePath);
});

const data = getDataForMode(props.sessionMode);
const isBoolean = computed(() => typeof props.value === 'boolean');

function updateStore(newValue: any) {
  if (props.schema.hasType('number') || props.schema.hasType('integer')) {
    const num = Number(newValue);
    data.setDataAt(props.absolutePath, Number.isNaN(num) ? newValue : num);
  } else {
    data.setDataAt(props.absolutePath, newValue);
  }
}

function onTextInput(value: any) {
  internalValue.value = value;
  if (isFocused.value) updateStore(value);
}

function onCheckboxChange() {
  updateStore(internalValue.value);
}
</script>

<template>
  <div class="table-cell-editor">
    <Checkbox
      v-if="isBoolean"
      v-model="internalValue"
      binary
      @change="onCheckboxChange"
      @focus="isFocused = true"
      @blur="isFocused = false"
      :class="{'p-invalid': !validationResults.valid}" />

    <InputText
      v-else
      class="h-8 w-full"
      :class="{'underline decoration-wavy decoration-red-600': !validationResults.valid}"
      :model-value="internalValue"
      @update:model-value="onTextInput"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @keydown.down.stop
      @keydown.up.stop
      @keydown.left.stop
      @keydown.right.stop
      @keyup.enter="updateStore(internalValue)" />
  </div>
</template>