<!-- Email input for string properties with email format -->
<script setup lang="ts">
import {ref, watch, computed} from 'vue';
import InputText from 'primevue/inputtext';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {PathElement} from '@/utility/path';
import type {ValidationResult} from '@/schema/validationService';
import {isReadOnly} from '@/components/panels/gui-editor/configTreeNodeReadingUtils';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: string | undefined;
  propertySchema: JsonSchemaWrapper;
  validationResults: ValidationResult;
}>();

const settings = useSettings();

const emit = defineEmits<{
  (e: 'update:propertyData', newValue: string | undefined): void;
}>();

const newPropertyData = ref(props.propertyData);

watch(
  () => props.propertyData,
  newVal => {
    newPropertyData.value = newVal;
  }
);

function updateValue() {
  emit('update:propertyData', newPropertyData.value);
}
</script>

<template>
  <InputText
    type="email"
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    class="h-8 tableInput"
    v-model="newPropertyData"
    placeholder="email@example.com"
    :disabled="isReadOnly(props.propertySchema)"
    @blur="updateValue"
    @keydown.down.stop
    @keydown.up.stop
    @keydown.left.stop
    @keydown.right.stop
    @keyup.enter="updateValue" />
</template>

<style scoped>
.tableInput {
  border: v-bind("settings.guiEditor.showBorderAroundInputFields ? '1px solid #d1d5db' : 'none'");
}
</style>
