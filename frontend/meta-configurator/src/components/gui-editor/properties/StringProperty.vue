<script setup lang="ts">
import InputText from "primevue/inputtext";
import { computed } from "vue";

const props = defineProps<{
  propertyName: string;
  propertyData: string | undefined;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', newValue: string): void;
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
  <InputText class="h-8" type="text" v-model="valueProperty"></InputText>
</template>

<style scoped></style>
