<template>
  <DataTable
    :value="data"
    v-model:filters="filters"
    v-model:selection="selectedTriples"
    scrollable
    size="small"
    scrollHeight="flex"
    resizableColumns
    :showGridlines="true"
    :paginator="true"
    @row-click="onRowClick"
    :rows="50"
    :stripedRows="true"
    filterDisplay="menu"
    frozenHeader
    @row-dblclick="openEditDialog"
    :globalFilterFields="['subject', 'predicate', 'object']"
    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
    :rowsPerPageOptions="[10, 20, 50]"
    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} triples">
    <template #header>
      <div class="flex justify-between items-center w-full">
        <div class="flex items-center gap-1">
          <Button label="Add" icon="pi pi-plus" variant="text" @click="openNewDialog" />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            variant="text"
            @click="confirmDeleteSelected"
            :disabled="!selectedTriples || !selectedTriples.length" />
        </div>
        <IconField>
          <Button type="button" icon="pi pi-filter-slash" variant="text" @click="clearFilter()" />
          <InputText v-model="filters['global'].value" placeholder="Search Triples" />
        </IconField>
      </div>
    </template>
    <Column frozen selectionMode="multiple" headerStyle="width: 3rem"></Column>
    <Column field="subject" header="Subject" sortable style="min-width: 12rem">
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by Object" />
      </template>
    </Column>
    <Column field="predicate" header="Predicate" sortable style="min-width: 16rem">
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by Object" />
      </template>
    </Column>
    <Column field="object" header="Object" sortable style="min-width: 16rem">
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by Object" />
      </template>
    </Column>
  </DataTable>
  <Dialog v-model:visible="editDialog" header="Triple Details" :modal="true">
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
  <Dialog v-model:visible="deleteDialog" header="Confirm" :modal="true">
    <div class="flex items-center gap-4">
      <i class="pi pi-exclamation-triangle !text-3xl" />
      <span v-if="triple">Are you sure you want to delete the selected triples?</span>
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
        @click="deleteSelectedTriples"
        severity="danger" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {ref, watch, computed, reactive} from 'vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode, useCurrentData} from '@/data/useDataLink';
import * as jsonld from 'jsonld';
import * as $rdf from 'rdflib';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import {JsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {FilterMatchMode} from '@primevue/core/api';
import type {Path} from '@/utility/path';

const props = defineProps<{sessionMode: SessionMode}>();
const nodeManager = ref<JsonLdNodeManager>();
const store = ref<$rdf.IndexedFormula | null>(null);
const editDialog = ref(false);
const deleteDialog = ref(false);
const newSubjectInput = ref('');
const selectedTriples = ref();
const predicateTypeOptions = [{label: 'Named Node', value: 'NamedNode'}];
const filters = ref();
const triple = ref({
  subject: '',
  subjectType: 'NamedNode',
  predicate: '',
  predicateType: 'NamedNode',
  object: '',
  objectType: 'Literal',
  quad: null as any,
});
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
const data = computed(() => {
  if (!store.value) return [];

  return store.value.statements.map((st, index) => ({
    id: index,
    subject: st.subject.value,
    predicate: st.predicate.value,
    object: st.object.value,
    quad: st,
  }));
});

const confirmDeleteSelected = () => {
  deleteDialog.value = true;
};

function onRowClick(event) {
  const position = nodeManager.value?.getQuadFieldPosition(event.data.subject);
  const path = reactive<Path>(['@graph', position, '@id']);
  emit('zoom_into_path', path);
}

const deleteSelectedTriples = async () => {
  if (!selectedTriples.value) return;

  for (const triple of selectedTriples.value) {
    store.value?.remove(triple.quad);
    await updateNodeInJsonLd(triple.subject);
  }
  deleteDialog.value = false;
  selectedTriples.value = null;
};

const clearFilter = () => {
  initFilters();
};

const namedNodes = computed(() => {
  if (!store.value) return [];
  const nodesSet = new Set<string>();
  store.value.statements.forEach(st => {
    if (st.subject.termType === 'NamedNode') {
      nodesSet.add(st.subject.value);
    }
  });
  const nodes = Array.from(nodesSet).map(n => ({label: n, value: n}));
  nodes.push({label: '+ Add new', value: '__new__'});
  return nodes;
});

watch(
  () => getDataForMode(props.sessionMode).data.value,
  async dataValue => {
    try {
      nodeManager.value = new JsonLdNodeManager(JSON.stringify(dataValue, null, 2));
      const {rdfStore} = await jsonLdToRdfStore(dataValue);
      store.value = rdfStore;
    } catch (err) {
      console.error('Error converting JSON-LD to RDF:', err);
    }
  },
  {immediate: true}
);

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
    quad: null,
  };
  editDialog.value = true;
};

const openEditDialog = (event: any) => {
  const trip = event.data;
  triple.value = {
    subject: trip.subject,
    subjectType: trip.quad?.subject?.termType,
    predicate: trip.predicate,
    predicateType: trip.quad?.predicate?.termType,
    object: trip.object,
    objectType: trip.quad?.object?.termType,
    quad: trip.quad,
  };
  editDialog.value = true;
};

const saveTriple = async () => {
  if (triple.value.subjectType === 'NamedNode' && triple.value.subject === '__new__') {
    triple.value.subject = newSubjectInput.value.trim();
    newSubjectInput.value = '';
  }

  if (triple.value.quad) {
    store.value?.remove(triple.value.quad);
  }

  addQuadToStore();

  if (triple.value.quad && triple.value.quad.subject !== triple.value.subject)
    await updateNodeInJsonLd(triple.value.quad.subject.value);

  await updateNodeInJsonLd(triple.value.subject);

  triple.value = {
    subject: '',
    subjectType: 'NamedNode',
    predicate: '',
    predicateType: 'NamedNode',
    object: '',
    objectType: 'Literal',
    quad: null,
  };

  editDialog.value = false;
};

async function updateNodeInJsonLd(tripId: string) {
  if (!nodeManager.value || !store.value) return;
  await nodeManager.value.rebuildNode(tripId, store.value);
  const updatedJsonLdText = nodeManager.value.getText();
  useCurrentData().setData(JSON.parse(updatedJsonLdText));
}

function addQuadToStore() {
  if (!store.value) return;
  const subjNode =
    triple.value.subjectType === 'BlankNode'
      ? triple.value.quad.subject
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

  store.value.add($rdf.st(subjNode, predNode, objNode, $rdf.defaultGraph()));
}

async function jsonLdToRdfStore(jsonLdString: string) {
  const jsonLdDoc = JSON.parse(JSON.stringify(jsonLdString));
  const nquads = (await jsonld.toRDF(jsonLdDoc, {
    format: 'application/n-quads',
  })) as string;

  const rdfStore = $rdf.graph();
  const baseUri = 'http://example.org/';

  await new Promise<void>((resolve, reject) => {
    $rdf.parse(nquads, rdfStore, baseUri, 'application/n-quads', err =>
      err ? reject(err) : resolve()
    );
  });

  return {rdfStore};
}

initFilters();
</script>
