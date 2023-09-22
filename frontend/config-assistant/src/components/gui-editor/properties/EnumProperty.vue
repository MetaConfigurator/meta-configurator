<script setup lang="ts">
import {computed, defineEmits, defineProps} from 'vue';
import Dropdown from 'primevue/dropdown';
import {ValidationResults} from '@/helpers/validationService';

const props = defineProps<{
  propertyName: string;
  possibleValues: Array<any>;
  propertyData: any | undefined;
  validationResults: ValidationResults;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', newValue: any): void;
}>();

const valueProperty = computed({
  get() {
    return props.propertyData;
  },
  set(newValue) {
    emit('update_property_value', newValue);
  },
});
</script>

<template>
  <div>
    <Dropdown
      class="tableInput w-full"
      :class="{'underline decoration-wavy decoration-red-600': !props.validationResults.valid}"
      v-model="valueProperty"
      editable
      :options="possibleValues"
      @keydown.stop
      :placeholder="`Select ${props.propertyName}`" />
  </div>
</template>

<style scoped>
div {
  display: flex;
  flex-direction: row;
  height: 30px;
}
.tableInput {
  border: none;
  box-shadow: none;
}
</style>
