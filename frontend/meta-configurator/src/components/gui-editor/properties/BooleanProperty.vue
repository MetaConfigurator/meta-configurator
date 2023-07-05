<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';
import {computed, ref} from 'vue';

const props = defineProps<{
  propertyName: string;
  propertyData: boolean | undefined;
}>();

const options = ref([
  {name: 'true', value: true},
  {name: 'false', value: false},
]);

const emit = defineEmits<{
  (e: 'update_property_value', newValue: boolean | undefined): void;
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
  <div class="pl-2">
    <SelectButton
      v-model="valueProperty"
      :options="options"
      option-label="name"
      option-value="value" />
  </div>
</template>

<style scoped></style>
