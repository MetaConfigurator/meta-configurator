<template>
  <div class="flex justify-between items-center w-full flex-nowrap">
    <div class="flex items-center gap-1 flex-shrink-0">
      <Button
        label="Add"
        icon="pi pi-plus"
        severity="contrast"
        variant="text"
        @click="emit('add')" />
      <Button
        label="Edit"
        icon="pi pi-pen-to-square"
        severity="contrast"
        variant="text"
        @click="emit('edit')"
        :disabled="!props.hasSelection" />
      <Button
        label="Delete"
        icon="pi pi-trash"
        severity="contrast"
        variant="text"
        @click="emit('delete')"
        :disabled="!props.hasSelection" />
      <Button
        label="Export"
        icon="pi pi-upload"
        severity="contrast"
        text
        :disabled="!props.hasItems"
        @click="toggleExportPopover" />
      <TieredMenu ref="exportPopover" :model="props.exportMenuItems" popup />
      <Button
        label="SPARQL"
        icon="pi pi-search"
        severity="contrast"
        variant="text"
        :disabled="!props.hasItems"
        @click="emit('sparql')" />
      <Button
        label="Visualize"
        icon="pi pi-globe"
        severity="contrast"
        variant="text"
        :disabled="!props.hasFilteredRows || !props.hasItems"
        @click="emit('visualize')" />
    </div>

    <IconField class="flex items-center gap-1 flex-shrink-0">
      <Button
        type="button"
        icon="pi pi-filter-slash"
        variant="text"
        @click="emit('clear-filters')" />
      <InputText
        :modelValue="props.globalFilterValue"
        placeholder="Search ..."
        @update:modelValue="onGlobalFilterChange" />
    </IconField>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue';
import TieredMenu from 'primevue/tieredmenu';
import IconField from 'primevue/iconfield';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const props = defineProps<{
  hasSelection: boolean;
  hasItems: boolean;
  hasFilteredRows: boolean;
  globalFilterValue: string | null;
  exportMenuItems: any[];
}>();

const emit = defineEmits<{
  (e: 'add'): void;
  (e: 'edit'): void;
  (e: 'delete'): void;
  (e: 'sparql'): void;
  (e: 'visualize'): void;
  (e: 'clear-filters'): void;
  (e: 'update:globalFilterValue', value: string | null): void;
}>();

const exportPopover = ref<any>(null);

function toggleExportPopover(event: Event) {
  exportPopover.value?.toggle?.(event);
}

function onGlobalFilterChange(value: string | null) {
  emit('update:globalFilterValue', value);
}
</script>
