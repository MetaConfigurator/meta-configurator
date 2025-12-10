<template>
  <DataTable
    :class="{'disabled-wrapper': !dataIsInJsonLd || dataIsUnparsable || parsingErrors.length > 0}"
    :value="items"
    @row-click="onRowClick"
    v-model:filters="filters"
    v-model:selection="selectedItem"
    scrollable
    scrollHeight="flex"
    removableSort
    size="small"
    resizableColumns
    :showGridlines="true"
    :paginator="true"
    :rows="50"
    :stripedRows="true"
    filterDisplay="menu"
    frozenHeader
    :globalFilterFields="['prefix', 'iri']"
    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
    :rowsPerPageOptions="[10, 20, 50]"
    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} triples">
    <template #header>
      <div class="flex justify-between items-center w-full">
        <div class="flex items-center gap-1">
          <Button label="Add" icon="pi pi-plus" variant="text" />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            variant="text"
            @click="confirmDeleteSelected"
            :disabled="!selectedItem" />
        </div>
        <IconField>
          <Button type="button" icon="pi pi-filter-slash" variant="text" @click="clearFilter()" />
          <InputText v-model="filters['global'].value" placeholder="Search ..." />
        </IconField>
      </div>
    </template>
    <Column frozen selectionMode="single" headerStyle="width: 3rem"> </Column>
    <Column field="prefix" header="Prefix" sortable>
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by Prefix" />
      </template>
    </Column>
    <Column field="iri" header="IRI" sortable>
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by IRI" />
      </template>
    </Column>
  </DataTable>
  <Dialog v-model:visible="deleteDialog" header="Confirm" :modal="true">
    <div class="flex items-center gap-4">
      <i class="pi pi-exclamation-triangle !text-3xl" />
      <span v-if="selectedItem">Are you sure you want to delete the selected item?</span>
    </div>
    <template #footer>
      <Button
        label="No"
        icon="pi pi-times"
        text
        @click="deleteDialog = false"
        severity="secondary"
        variant="text" />
      <Button
        label="Yes"
        icon="pi pi-check"
        text
        @click="deleteSelectedContext"
        severity="danger" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {FilterMatchMode} from '@primevue/core/api';
import type {Path} from '@/utility/path';

const deleteDialog = ref(false);
const selectedItem = ref();
const filters = ref();

const props = defineProps<{
  dataIsUnparsable: boolean;
  dataIsInJsonLd: boolean;
}>();
const emit = defineEmits<{
  (e: 'zoom_into_path', path: Path): void;
}>();
const initFilters = () => {
  filters.value = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
    prefix: {value: null, matchMode: FilterMatchMode.CONTAINS},
  };
};

const items = computed(() => {
  return Object.entries(rdfStoreManager.namespaces.value).map(([prefix, iri]) => ({
    id: prefix,
    prefix: prefix,
    iri: iri,
  }));
});

const confirmDeleteSelected = () => {
  deleteDialog.value = true;
};

const deleteSelectedContext = () => {
  if (!selectedItem.value) return;

  rdfStoreManager.deleteStatement(selectedItem.value.statement);
  jsonLdNodeManager.deleteStatement(selectedItem.value.statement);
  deleteDialog.value = false;
  selectedItem.value = null;
};

const parsingErrors = computed(() => {
  return rdfStoreManager.parseErrors.value.map((msg, index) => ({
    id: index,
    message: msg,
  }));
});

const clearFilter = () => {
  initFilters();
};

watch(selectedItem, (value, _) => {
  if (value) {
    emit('zoom_into_path', ['@context', value.prefix]);
  }
});

function onRowClick(event: any) {
  emit('zoom_into_path', ['@context', event.data.prefix]!);
}

initFilters();
</script>

<style scoped>
.disabled-wrapper {
  position: relative;
}

.disabled-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  pointer-events: auto;
}

.disabled-wrapper > * {
  pointer-events: none;
  opacity: 0.5;
}
</style>
