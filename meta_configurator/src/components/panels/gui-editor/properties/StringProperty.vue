<!-- Text input for string properties -->
<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import InputText from 'primevue/inputtext';
import {generatePlaceholderText} from '@/utility/propertyPlaceholderGenerator';
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

const polishedPropertyData = computed(() => {
  if (props.propertyData === undefined) {
    return '';
  }
  if (typeof props.propertyData === 'object') {
    // if the property data is an empty object, we return an empty string
    if (props.propertyData !== null && Object.keys(props.propertyData).length === 0) {
      return '';
    }
    // if the property data is an object with properties, we stringify it to display it in the input field
    return JSON.stringify(props.propertyData);
  }
  return props.propertyData;
});

// new reference to the property data, so that we can emit the update event
// only when the user is done editing and not on every keystroke
const newPropertyData = ref(props.propertyData);

// update the newPropertyData reference when the props change
watch(polishedPropertyData, setNewPropertyData);

function setNewPropertyData(newValue: string | undefined) {
  newPropertyData.value = newValue;
}

function updateValue() {
  emit('update:propertyData', newPropertyData.value);
}
</script>

<template>
  <InputText
    :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
    class="h-8 tableInput"
    :model-value="polishedPropertyData"
    @update:model-value="setNewPropertyData"
    :placeholder="generatePlaceholderText(props.propertySchema, props.propertyName)"
    :disabled="isReadOnly(props.propertySchema)"
    @blur="updateValue"
    @keydown.down.stop
    @keydown.up.stop
    @keydown.left.stop
    @keydown.right.stop
    @keyup.enter="updateValue" />
</template>

<style scoped>
/* remove border so it fits the look of the table better */
.tableInput {
  border: v-bind("settings.guiEditor.showBorderAroundInputFields ? '1px solid #d1d5db' : 'none'");
}

::placeholder {
  color: #a8a8a8;
}
</style>
