<template>
  <DataTable
    :class="{'disabled-wrapper': !dataIsInJsonLd || dataIsUnparsable || parsingErrors.length > 0}"
    :value="items"
    @row-click="onRowClick"
    :loading="loading"
    v-model:first="first"
    v-model:filters="filters"
    v-model:selection="selectedTriple"
    @row-select="onUserSelect"
    @row-unselect="onUserUnselect"
    scrollable
    scrollHeight="flex"
    removableSort
    size="small"
    resizableColumns
    :showGridlines="true"
    paginator
    v-model:rows="rowsPerPage"
    stripedRows
    filterDisplay="menu"
    frozenHeader
    :rowAttrs="{tabindex: 0}"
    @row-dblclick="openEditDialog"
    @filter="onFilter"
    :globalFilterFields="['subject', 'predicate', 'object']"
    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
    :rowsPerPageOptions="[10, 20, 50]"
    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} triples">
    <template #header>
      <div class="flex justify-between items-center w-full flex-nowrap">
        <div class="flex items-center gap-1 flex-shrink-0">
          <Button
            label="Add"
            icon="pi pi-plus"
            severity="contrast"
            variant="text"
            @click="openNewDialog" />
          <Button
            label="Edit"
            icon="pi pi-pen-to-square"
            severity="contrast"
            variant="text"
            @click="openEditDialog"
            :disabled="!selectedTriple" />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="contrast"
            variant="text"
            @click="confirmDeleteSelected"
            :disabled="!selectedTriple" />
          <Divider layout="vertical" class="mx-1" />
          <Button
            label="Export"
            icon="pi pi-upload"
            severity="contrast"
            text
            :disabled="items.length === 0"
            @click="toggleExportPopover" />
          <Popover ref="exportPopover">
            <Menu :style="'border: none'" :model="exportMenuItems" />
          </Popover>
          <Button
            label="SPARQL"
            icon="pi pi-search"
            severity="contrast"
            variant="text"
            :disabled="items.length === 0"
            @click="openSparqlEditor" />
          <Button
            label="Visualize"
            icon="pi pi-globe"
            severity="contrast"
            variant="text"
            :disabled="filteredRows.length === 0 || items.length === 0"
            @click="openVisualizer" />
        </div>
        <IconField class="flex items-center gap-1 flex-shrink-0">
          <Button type="button" icon="pi pi-filter-slash" variant="text" @click="clearFilter()" />
          <InputText v-model="filters['global'].value" placeholder="Search ..." />
        </IconField>
      </div>
    </template>
    <Column frozen selectionMode="single" headerStyle="width: 3rem"> </Column>
    <Column field="subject" header="Subject" sortable>
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by Object" />
      </template>
    </Column>
    <Column field="predicate" header="Predicate" sortable>
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by Object" />
      </template>
    </Column>
    <Column field="object" header="Object" sortable>
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by Object" />
      </template>
    </Column>
  </DataTable>
  <Dialog
    v-model:visible="editDialog"
    header="Triple Details"
    modal
    maximizable
    :draggable="false"
    :style="{width: '640px', height: '520px'}"
    contentStyle="overflow-y: auto">
    <div class="flex flex-col gap-6 w-full">
      <div>
        <label class="block font-bold mb-3">Subject</label>
        <div class="flex gap-2 w-full items-center">
          <Select
            v-model="triple.subjectType"
            :options="subjectTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="fixed-select" />
          <template v-if="triple.subjectType === 'NamedNode'">
            <ToggleButton
              v-model="addNewSubject"
              onLabel="New"
              offLabel="Existing"
              onIcon="pi pi-plus"
              offIcon="pi pi-list"
              class="fixed-toggle" />
            <Select
              v-if="!addNewSubject"
              v-model="triple.subject"
              :options="nodes"
              filter
              optionLabel="label"
              optionValue="value"
              class="flex-1 min-w-[200px]" />
            <InputText
              v-else
              v-model="newSubjectInput"
              placeholder="Enter new IRI"
              class="flex-1 min-w-[260px]" />
          </template>
          <template v-else>
            <InputText v-model.trim="triple.subject" required class="flex-1 min-w-[260px]" />
          </template>
        </div>
      </div>
      <div>
        <label class="block font-bold mb-3">Predicate</label>
        <div class="flex gap-2 w-full items-center">
          <Select
            v-model="triple.predicateType"
            :options="predicateTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="fixed-select" />
          <InputText v-model.trim="triple.predicate" required class="flex-1 min-w-[260px]" />
        </div>
      </div>
      <div>
        <label class="block font-bold mb-3">Object</label>
        <div class="flex gap-2 w-full items-center">
          <Select
            v-model="triple.objectType"
            :options="objectTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="fixed-select" />
          <template v-if="triple.objectType === 'NamedNode'">
            <ToggleButton
              v-model="addNewObject"
              onLabel="New"
              offLabel="Existing"
              onIcon="pi pi-plus"
              offIcon="pi pi-list"
              class="fixed-toggle" />
            <Select
              v-if="!addNewObject"
              v-model="triple.object"
              :options="nodes"
              filter
              optionLabel="label"
              optionValue="value"
              class="flex-1 min-w-[200px]" />
            <InputText
              v-else
              v-model="newObjectInput"
              placeholder="Enter new IRI"
              class="flex-1 min-w-[260px]" />
          </template>
          <template v-else>
            <InputText v-model.trim="triple.object" required class="flex-1 min-w-[260px]" />
          </template>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 pt-3">
        <Button label="Cancel" severity="secondary" @click="editDialog = false" />
        <Button label="Save" @click="saveTriple" />
      </div>
    </template>
  </Dialog>
  <Dialog v-model:visible="deleteDialog" header="Confirm" modal>
    <div class="flex items-center gap-4">
      <i class="pi pi-exclamation-triangle !text-3xl" />
      <span v-if="triple">Are you sure you want to delete the selected triple?</span>
    </div>
    <template #footer>
      <Button
        label="No"
        icon="pi pi-times"
        text
        @click="deleteDialog = false"
        severity="secondary"
        variant="text" />
      <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedTriple" severity="danger" />
    </template>
  </Dialog>
  <Dialog
    v-model:visible="sparqlDialog"
    header="SPARQL"
    modal
    maximizable
    :style="{width: '800px', height: '800px'}"
    :contentStyle="{height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}">
    <SparqlEditor />
  </Dialog>
  <Dialog
    v-model:visible="visualizerDialog"
    header="Visualization"
    modal
    maximizable
    :style="{width: '800px', height: '800px'}"
    :contentStyle="{height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}">
    <RdfVisualizer :statements="filteredStatements" @cancel-render="closeVisualizer" />
  </Dialog>
</template>

<script setup lang="ts">
import {nextTick} from 'vue';
import {ref, computed, watch} from 'vue';
import DataTable from 'primevue/datatable';
import type {DataTableFilterEvent} from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Popover from 'primevue/popover';
import Divider from 'primevue/divider';
import Menu from 'primevue/menu';
import ToggleButton from 'primevue/togglebutton';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {FilterMatchMode} from '@primevue/core/api';
import type {Path} from '@/utility/path';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import SparqlEditor from '@/components/panels/rdf/SparqlEditor.vue';
import RdfVisualizer from '@/components/panels/rdf/RdfVisualizer.vue';
import {downloadFile} from '@/utility/rdfUtils';
import {useErrorService} from '@/utility/errorServiceInstance';
import {
  TripleEditorService,
  type TripleTransferObject,
} from '@/components/panels/rdf/tripleEditorService';

const filteredRows = ref<any[]>([]);
const props = defineProps<{
  dataIsUnparsable: boolean;
  dataIsInJsonLd: boolean;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path: Path): void;
}>();

const exportPopover = ref();
const first = ref(0);
const rowsPerPage = ref(50);
const dataSession = getSessionForMode(SessionMode.DataEditor);

const editDialog = ref(false);
const deleteDialog = ref(false);
const sparqlDialog = ref(false);
const visualizerDialog = ref(false);

const loading = ref(false);
const addNewSubject = ref(false);
const addNewObject = ref(false);
const newObjectInput = ref('');
const newSubjectInput = ref('');
const isUserSelection = ref(false);
const selectedTriple = ref();

const predicateTypeOptions = [{label: 'Named Node', value: 'NamedNode'}];
const filters = ref();
const exportMenuItems = [
  {
    label: 'Turtle',
    icon: 'pi pi-file',
    command: () => exportAs('text/turtle'),
  },
  {
    label: 'N-Triples',
    icon: 'pi pi-file',
    command: () => exportAs('application/n-triples'),
  },
  {
    label: 'RDF/XML',
    icon: 'pi pi-file',
    command: () => exportAs('application/rdf+xml'),
  },
];

const triple = ref<TripleTransferObject>({
  subject: '',
  subjectType: 'NamedNode',
  predicate: '',
  predicateType: 'NamedNode',
  object: '',
  objectType: 'Literal',
});

const initFilters = () => {
  filters.value = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
    subject: {value: null, matchMode: FilterMatchMode.CONTAINS},
    predicate: {value: null, matchMode: FilterMatchMode.CONTAINS},
    object: {value: null, matchMode: FilterMatchMode.CONTAINS},
  };
};

const objectTypeOptions = [
  {label: 'Named Node', value: 'NamedNode'},
  {label: 'Literal', value: 'Literal'},
];

const subjectTypeOptions = [{label: 'Named Node', value: 'NamedNode'}];

const items = computed(() => {
  const mappedItems = rdfStoreManager.statements.value.map((statement, index) => ({
    id: index,
    subject: translateIRI(statement.subject.value),
    predicate: translateIRI(statement.predicate.value),
    object: translateIRI(statement.object.value),
    statement: statement,
  }));

  loading.value = false;
  return mappedItems;
});

const toggleExportPopover = (event: Event) => {
  exportPopover.value.toggle(event);
};

function onUserSelect() {
  isUserSelection.value = true;
}

function onUserUnselect() {
  isUserSelection.value = true;
}

async function selectRowByIndex(index: number) {
  const rowsPerPageValue = rowsPerPage.value;
  const page = Math.floor(index / rowsPerPageValue);
  const newFirst = page * rowsPerPageValue;
  let pageChanged = false;
  if (first.value !== newFirst) {
    first.value = newFirst;
    pageChanged = true;
    await nextTick();
  }
  const row = items.value[index];
  if (row) {
    selectedTriple.value = row;
    const localIndex = index % rowsPerPageValue;
    const rowEl = document.querySelector(`tr[data-p-index="${localIndex}"]`) as HTMLElement;
    if (rowEl) {
      rowEl.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  }
}

function onFilter(e: DataTableFilterEvent) {
  filteredRows.value = e.filteredValue ?? [];
}

const filteredStatements = computed(() =>
  (filteredRows.value.length ? filteredRows.value : items.value).map(row => row.statement)
);

const confirmDeleteSelected = () => {
  deleteDialog.value = true;
};

const openVisualizer = () => {
  visualizerDialog.value = true;
};

const openSparqlEditor = () => {
  sparqlDialog.value = true;
};

function closeVisualizer() {
  visualizerDialog.value = false;
}

const deleteSelectedTriple = () => {
  if (!selectedTriple.value) return;
  const result = TripleEditorService.delete(selectedTriple.value.statement);

  if (!result.success) {
    useErrorService().onError(result.errorMessage!);
    return;
  }

  deleteDialog.value = false;
  selectedTriple.value = null;
};

const clearFilter = () => {
  initFilters();
};

const nodes = computed(() => {
  const nodesSet = new Set<string>();
  rdfStoreManager.statements.value.forEach(st => {
    if (st.subject.termType === 'NamedNode') {
      nodesSet.add(st.subject.value);
    }
  });
  return Array.from(nodesSet).map(n => ({label: n, value: n}));
});

watch(selectedTriple, (target, _) => {
  if (!target) return;
  if (isUserSelection.value) {
    const path = jsonLdNodeManager.findPath(target.statement);
    if (path) {
      emit('zoom_into_path', path);
    }
  }
  isUserSelection.value = false;
});

const openNewDialog = () => {
  triple.value = {
    subject: '',
    subjectType: 'NamedNode',
    predicate: '',
    predicateType: 'NamedNode',
    object: '',
    objectType: 'Literal',
    statement: undefined,
  };
  editDialog.value = true;
};

const openEditDialog = () => {
  if (!selectedTriple.value) return;
  const st = selectedTriple.value.statement;
  triple.value = {
    subject: st.subject.value,
    subjectType: st.subject.termType,
    predicate: st.predicate.value,
    predicateType: st.predicate.termType,
    object: st.object.value,
    objectType: st.object.termType,
    statement: selectedTriple.value.statement,
  };

  editDialog.value = true;
};

const saveTriple = () => {
  const result = TripleEditorService.addOrEdit(triple.value);

  if (!result.success) {
    useErrorService().onError(result.errorMessage!);
    return;
  }

  editDialog.value = false;
};

const parsingErrors = computed(() => {
  return rdfStoreManager.parseErrors.value.map((msg, index) => ({
    id: index,
    message: msg,
  }));
});

watch(
  [dataSession.dataAtCurrentPath, dataSession.currentSelectedElement],
  async () => {
    const absolutePath = dataSession.currentSelectedElement.value;
    let index = await rdfStoreManager.findMatchingStatementIndex(absolutePath);
    if (index !== -1) {
      await selectRowByIndex(index);
    } else {
      selectedTriple.value = null;
    }
  },
  {deep: true}
);

watch(
  () => getDataForMode(SessionMode.DataEditor).data.value,
  _ => {
    loading.value = true;
  }
);

function onRowClick(event: any) {
  const path = jsonLdNodeManager.findPath(event.data.statement);
  if (path) {
    emit('zoom_into_path', path!);
  }
}

function translateIRI(iriTerm: string) {
  return iriTerm;
}

function exportAs(format: string) {
  const serialized = rdfStoreManager.exportAs(format);
  downloadFile(serialized, format);
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

.fixed-toggle {
  width: 110px;
  min-width: 110px;
}
</style>
