<template>
  <div class="datatable-wrapper">
    <DataTable
      v-if="results.length"
      size="small"
      :value="results"
      scrollable
      stripedRows
      paginator
      frozenHeader
      resizableColumns
      :filters="filters"
      @update:filters="emit('update:filters', $event)"
      filterDisplay="menu"
      scrollHeight="flex"
      :rows="50"
      :rowsPerPageOptions="[10, 20, 50]"
      paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
      currentPageReportTemplate="{first} to {last} of {totalRecords} records">
      <template v-if="columns.length > 0" #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <Button
              label="Export"
              icon="pi pi-upload"
              severity="contrast"
              text
              :disabled="!results.length"
              @click="toggleExportPopover" />
            <TieredMenu ref="exportPopover" :model="exportMenuItems" popup />
          </div>
          <IconField>
            <Button
              type="button"
              icon="pi pi-filter-slash"
              variant="text"
              v-tooltip="'Clear all filters'"
              @click="emit('clear-filters')" />
            <InputText
              :modelValue="filters['global']?.value"
              @update:modelValue="updateGlobalFilter"
              placeholder="Search ..." />
          </IconField>
        </div>
      </template>
      <Column
        v-for="col in columns"
        :key="col"
        :field="col"
        :header="col"
        sortable
        filter
        filterMatchMode="contains">
        <template #body="{data}">
          {{ formatCellValue(data[col]) }}
        </template>
        <template #filter="{filterModel, filterCallback}">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            :placeholder="`Search by ${col}`"
            class="p-column-filter" />
        </template>
      </Column>
    </DataTable>
    <Message v-else severity="warn"> No results. Please check your query. </Message>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue';
import TieredMenu from 'primevue/tieredmenu';
import Message from 'primevue/message';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import {formatCellValue} from '@/components/panels/rdf/rdfUtils';

const props = defineProps<{
  results: Record<string, string>[];
  columns: string[];
  filters: Record<string, any>;
  exportMenuItems: any[];
}>();

const emit = defineEmits<{
  (e: 'update:filters', value: Record<string, any>): void;
  (e: 'clear-filters'): void;
}>();

const exportPopover = ref<any>(null);

function updateGlobalFilter(value: string | null) {
  const nextFilters = {
    ...props.filters,
    global: {
      ...(props.filters.global ?? {}),
      value,
    },
  };
  emit('update:filters', nextFilters);
}

function toggleExportPopover(event: Event) {
  exportPopover.value?.toggle?.(event);
}
</script>

<style scoped>
.datatable-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.p-datatable) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.p-datatable-wrapper) {
  flex: 1;
  overflow: auto;
}
</style>
