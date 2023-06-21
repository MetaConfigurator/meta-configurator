<script setup lang="ts">
import Checkbox from 'primevue/checkbox';
import {computed} from 'vue';

const props = defineProps<{
  propertyName: string;
  propertyData: boolean | undefined;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', newValue: boolean): void;
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
  <Checkbox v-model="valueProperty" :binary="true" value="propertyName" />
</template>

<style scoped></style>
