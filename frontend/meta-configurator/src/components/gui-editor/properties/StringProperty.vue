<script setup lang="ts">
import {computed, ref} from 'vue';
import InputText from 'primevue/inputtext';
import type {PathElement} from '@/model/path';
import {watchThrottled} from '@vueuse/core';

const props = defineProps<{
  propertyName: PathElement;
  propertyData: string | undefined;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', newValue: string | undefined): void;
}>();

const valueProperty = ref<string | undefined>(props.propertyData);
watchThrottled(
  props,
  () => {
    valueProperty.value = props.propertyData;
  },
  {immediate: true, throttle: 500, deep: true}
);

function updateValue() {
  if (valueProperty.value === undefined) {
    return;
  }
  emit('update_property_value', valueProperty.value);
}
</script>

<template>
  <InputText
    :class="$style.tableInput"
    class="h-8"
    v-model="valueProperty"
    @blur="updateValue"
    @keydown="
      ev => {
        if (ev.key === 'Enter') {
          updateValue();
        }
      }
    " />
</template>

<style module>
/* remove border so it fits the look of the table better */
.tableInput {
  border: none;
}
</style>
