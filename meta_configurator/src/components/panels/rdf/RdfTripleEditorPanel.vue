<template>
  <DataTable
    :class="{'disabled-wrapper': !dataIsInJsonLd || dataIsUnparsable || parsingErrors.length > 0}"
    :value="items"
    @row-click="onRowClick"
    v-model:first="first"
    v-model:filters="filters"
    v-model:selection="selectedTriple"
    scrollable
    scrollHeight="flex"
    removableSort
    size="small"
    resizableColumns
    :showGridlines="true"
    :paginator="true"
    v-model:rows="rowsPerPage"
    :stripedRows="true"
    filterDisplay="menu"
    frozenHeader
    :rowAttrs="{tabindex: 0}"
    @row-dblclick="openEditDialog"
    :globalFilterFields="['subject', 'predicate', 'object']"
    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
    :rowsPerPageOptions="[10, 20, 50]"
    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} triples">
    <template #header>
      <div class="flex justify-between items-center w-full">
        <div class="flex items-center gap-1">
          <Button
            label="Add"
            icon="pi pi-plus"
            severity="contrast"
            variant="text"
            @click="openNewDialog" />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="contrast"
            variant="text"
            @click="confirmDeleteSelected"
            :disabled="!selectedTriple" />
          <Button
            label="Export"
            icon="pi pi-upload"
            severity="contrast"
            text
            @click="toggleExportMenu" />
          <Menu ref="exportMenu" :model="exportMenuItems" popup />
          <Button
            label="SPARQL"
            icon="pi pi-search"
            severity="contrast"
            variant="text"
            @click="openSparqlEditor" />
        </div>
        <IconField>
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
  <Dialog v-model:visible="editDialog" header="Triple Details" modal>
    <div class="flex flex-col gap-6">
      <label class="block font-bold mb-3">Subject</label>
      <div class="flex gap-2">
        <Select
          v-model="triple.subjectType"
          :options="subjectTypeOptions"
          optionLabel="label"
          optionValue="value"
          class="w-45" />
        <template v-if="triple.subjectType === 'NamedNode'">
          <Select
            v-model="triple.subject"
            :options="namedNodes"
            filter
            optionLabel="label"
            optionValue="value"
            class="flex-1" />
          <InputText
            v-if="triple.subject === '__new__'"
            v-model="newSubjectInput"
            placeholder="Enter new IRI"
            class="flex-1" />
        </template>
        <template v-else>
          <InputText v-model.trim="triple.subject" required class="flex-1" />
        </template>
      </div>
      <div>
        <label for="predicate" class="block font-bold mb-3">Predicate</label>
        <div class="flex gap-2">
          <Select
            v-model="triple.predicateType"
            :options="predicateTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-45" />
          <InputText v-model.trim="triple.predicate" required class="flex-1" />
        </div>
      </div>
      <div>
        <label for="object" class="block font-bold mb-3">Object</label>
        <div class="flex gap-2">
          <Select
            v-model="triple.objectType"
            :options="objectTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-45" />
          <InputText v-model.trim="triple.object" required class="flex-1" />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
      <Button label="Save" icon="pi pi-check" @click="saveTriple" />
    </template>
  </Dialog>
  <Dialog v-model:visible="deleteDialog" header="Confirm" modal>
    <div class="flex items-center gap-4">
      <i class="pi pi-exclamation-triangle !text-3xl" />
      <span v-if="triple">Are you sure you want to delete the selected item?</span>
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
    :style="{width: '600px', height: '600px'}">
    <SparqlEditor />
  </Dialog>
</template>

<script setup lang="ts">
import {nextTick} from 'vue';
import {ref, computed, watch} from 'vue';
import * as $rdf from 'rdflib';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {FilterMatchMode} from '@primevue/core/api';
import type {Path} from '@/utility/path';
import Menu from 'primevue/menu';
import {getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import SparqlEditor from '@/components/panels/rdf/SparqlEditor.vue';
import type {height} from '@fortawesome/free-solid-svg-icons/faLock';

const first = ref(0);
const rowsPerPage = ref(50);
const dataSession = getSessionForMode(SessionMode.DataEditor);

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
  {
    label: 'N-Quads',
    icon: 'pi pi-file',
    command: () => exportAs('application/n-quads'),
  },
];
const exportMenu = ref();
const editDialog = ref(false);
const deleteDialog = ref(false);
const sparqlDialog = ref(false);
const newSubjectInput = ref('');
const selectedTriple = ref();
const predicateTypeOptions = [{label: 'Named Node', value: 'NamedNode'}];
const filters = ref();
const triple = ref({
  subject: '',
  subjectType: 'NamedNode',
  predicate: '',
  predicateType: 'NamedNode',
  object: '',
  objectType: 'Literal',
  statement: null as any,
});
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
    subject: {value: null, matchMode: FilterMatchMode.CONTAINS},
    predicate: {value: null, matchMode: FilterMatchMode.CONTAINS},
    object: {value: null, matchMode: FilterMatchMode.CONTAINS},
  };
};

const objectTypeOptions = [
  {label: 'Named Node', value: 'NamedNode'},
  {label: 'Blank Node', value: 'BlankNode'},
  {label: 'Literal', value: 'Literal'},
];
const subjectTypeOptions = [
  {label: 'Named Node', value: 'NamedNode'},
  {label: 'Blank Node', value: 'BlankNode'},
];

const items = computed(() => {
  return rdfStoreManager.statements.value.map((st, index) => ({
    id: index,
    subject: translateIRI(st.subject.value),
    predicate: translateIRI(st.predicate.value),
    object: translateIRI(st.object.value),
    statement: st,
  }));
});

async function selectRowByIndex(index: number) {
  const page = Math.floor(index / rowsPerPage.value);
  if (first.value !== page * rowsPerPage.value) {
    first.value = page * rowsPerPage.value;
    await nextTick();
  }
  const row = items.value[index];
  if (row) {
    selectedTriple.value = row;
    const rowEl = document.querySelector(`tr[data-p-index="${index}"]`) as HTMLElement;
    if (rowEl) {
      rowEl.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  }
}

const confirmDeleteSelected = () => {
  deleteDialog.value = true;
};

const openSparqlEditor = () => {
  sparqlDialog.value = true;
};

const deleteSelectedTriple = () => {
  if (!selectedTriple.value) return;
  rdfStoreManager.deleteStatement(selectedTriple.value.statement);
  jsonLdNodeManager.deleteStatement(selectedTriple.value.statement);
  deleteDialog.value = false;
  selectedTriple.value = null;
};

const clearFilter = () => {
  initFilters();
};

const namedNodes = computed(() => {
  const nodesSet = new Set<string>();
  rdfStoreManager.statements.value.forEach(st => {
    if (st.subject.termType === 'NamedNode') {
      nodesSet.add(st.subject.value);
    }
  });
  const nodes = Array.from(nodesSet).map(n => ({label: n, value: n}));
  nodes.push({label: '+ Add new', value: '__new__'});
  return nodes;
});

function toggleExportMenu(event: Event) {
  exportMenu.value.toggle(event);
}

watch(selectedTriple, (target, _) => {
  if (target) {
    const path = jsonLdNodeManager.findPath(target.statement);
    if (path) {
      emit('zoom_into_path', path!);
    }
  }
});

const hideDialog = () => {
  editDialog.value = false;
};

const openNewDialog = () => {
  triple.value = {
    subject: '',
    subjectType: 'NamedNode',
    predicate: '',
    predicateType: 'NamedNode',
    object: '',
    objectType: 'Literal',
    statement: null,
  };
  editDialog.value = true;
};

const openEditDialog = (event: any) => {
  const trip = event.data;
  triple.value = {
    subject: trip.statement?.subject.value,
    subjectType: trip.statement?.subject?.termType,
    predicate: trip.statement?.predicate.value,
    predicateType: trip.statement?.predicate?.termType,
    object: trip.statement?.object.value,
    objectType: trip.statement?.object?.termType,
    statement: trip.statement,
  };
  editDialog.value = true;
};

const saveTriple = async () => {
  if (triple.value.subjectType === 'NamedNode' && triple.value.subject === '__new__') {
    triple.value.subject = newSubjectInput.value.trim();
    newSubjectInput.value = '';
  }

  addstatementToStore();

  if (triple.value.statement && triple.value.statement.subject !== triple.value.subject)
    await updateNodeInJsonLd(triple.value.statement.subject.value);

  await updateNodeInJsonLd(triple.value.subject);

  triple.value = {
    subject: '',
    subjectType: 'NamedNode',
    predicate: '',
    predicateType: 'NamedNode',
    object: '',
    objectType: 'Literal',
    statement: null,
  };

  editDialog.value = false;
};

const parsingErrors = computed(() => {
  return rdfStoreManager.parseErrors.value.map((msg, index) => ({
    id: index,
    message: msg,
  }));
});

watch(
  dataSession.currentSelectedElement,
  async () => {
    const absolutePath = dataSession.currentSelectedElement.value;
    let index = rdfStoreManager.findMatchingStatementIndex(absolutePath);
    if (index !== -1) {
      await selectRowByIndex(index);
    }
  },
  {deep: true}
);

async function updateNodeInJsonLd(tripId: string) {
  // if (!nodeManager.value || !store.value) return;
  // await nodeManager.value.rebuildNode(tripId, store.value);
  // const updatedJsonLdText = nodeManager.value.getText();
  // useCurrentData().setData(JSON.parse(updatedJsonLdText));
}

function onRowClick(event: any) {
  const path = jsonLdNodeManager.findPath(event.data.statement);
  if (path) {
    emit('zoom_into_path', path!);
  }
}

function addstatementToStore() {
  const subjNode =
    triple.value.subjectType === 'BlankNode'
      ? triple.value.statement.subject
      : $rdf.sym(triple.value.subject);
  const predNode = $rdf.sym(triple.value.predicate);
  let objNode;
  if (triple.value.objectType === 'Literal') {
    objNode = $rdf.literal(triple.value.object);
  } else if (triple.value.objectType === 'BlankNode') {
    objNode = $rdf.blankNode(triple.value.object);
  } else {
    objNode = $rdf.sym(triple.value.object);
  }
  const newSt = $rdf.st(subjNode, predNode, objNode, $rdf.defaultGraph());
  rdfStoreManager.addStatement(newSt);
  jsonLdNodeManager.addStatement(newSt);
}

function translateIRI(iriTerm: string) {
  return iriTerm;
}

function exportAs(format: string) {
  const serialized = rdfStoreManager.exportAs(format);
  downloadFile(serialized, format);
}

function downloadFile(
  serialized: {content: string; success: boolean; errorMessage: string},
  format: string
) {
  const blob = new Blob([serialized.content], {type: format});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data.${getFileExtension(format)}`;
  a.click();
  URL.revokeObjectURL(url);
}

function getFileExtension(format: string): string {
  switch (format) {
    case 'text/turtle':
      return 'ttl';
    case 'application/n-triples':

    case 'text/plain':
      return 'nt';

    case 'application/ld+json':
      return 'jsonld';

    case 'application/rdf+xml':
      return 'rdf';

    case 'application/n-quads':
      return 'nq';

    default:
      return 'txt';
  }
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
