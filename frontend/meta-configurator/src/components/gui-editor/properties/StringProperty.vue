<script setup lang="ts">
import {computed} from 'vue';
import InputText from 'primevue/inputtext';

const props = defineProps<{
  propertyName: string;
  propertyData: string | undefined;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', newValue: string | undefined): void;
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
  <InputText :class="$style.tableInput" class="h-8" v-model="valueProperty"></InputText>
</template>

<style module>
/* remove border so it fits the look of the table better */
.tableInput {
  border: none;
}
</style>
