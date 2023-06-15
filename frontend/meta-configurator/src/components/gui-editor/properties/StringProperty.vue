<script setup lang="ts">
import InputText from 'primevue/inputtext';
import {computed} from 'vue';

const props = defineProps<{
  propertyName: string;
  propertyData: string;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', propertyName: string, newValue: string): void;
}>();

const valueProperty = computed({
  get() {
    return props.propertyData;
  },
  set(newValue) {
    emit('update_property_value', props.propertyName, newValue);
  },
});
</script>

<template>
  <InputText type="text" v-model="valueProperty"></InputText>
</template>

<style scoped></style>
