<script setup lang="ts">
import {computed, defineProps, defineEmits} from 'vue';
import Dropdown from 'primevue/dropdown';

const props = defineProps<{
  propertyName: string;
  possibleValues: Array<any>;
  propertyData: any | undefined;
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
      v-model="valueProperty"
      editable
      showClear
      :options="possibleValues"
      placeholder="Select a Country" />
  </div>
</template>

<style scoped>
div {
  display: flex;
  flex-direction: row;
  height: 30px;
  width: 400px;
}
</style>
