<template>
  <div class="panel-tab-container">
    <div
      v-if="dataHasSyntaxError"
      class="border border-red-400 bg-red-50 text-red-800 p-4 rounded m-1">
      Your data contains syntax errors. Please correct them before proceeding.
    </div>
    <div
      v-if="dataHasSemanticsError"
      class="border border-red-400 bg-red-50 text-red-800 p-4 rounded m-1">
      {{ semanticErrors }}
    </div>
    <Tabs value="graph">
      <TabList>
        <Tab value="context">Context</Tab>
        <Tab value="graph">Graph</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="context"> </TabPanel>
        <TabPanel value="graph">
          <DataTable
            :class="{'disabled-wrapper': dataHasSyntaxError || dataHasSemanticsError}"
            :value="data"
            @row-click="onRowClick"
            v-model:filters="filters"
            v-model:selection="selectedTriples"
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
                  <Button
                    type="button"
                    icon="pi pi-filter-slash"
                    variant="text"
                    @click="clearFilter()" />
                  <InputText v-model="filters['global'].value" placeholder="Search Triples" />
                </IconField>
              </div>
            </template>
            <Column frozen selectionMode="multiple" headerStyle="width: 3rem"> </Column>
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
        </TabPanel>
      </TabPanels>
    </Tabs>
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
  </div>
</template>

<script setup lang="ts">
import {ref, watch, computed} from 'vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode, getValidationForMode, useCurrentData} from '@/data/useDataLink';
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
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{sessionMode: SessionMode}>();
const nodeManager = ref<JsonLdNodeManager>();
const store = ref<$rdf.IndexedFormula | null>(null);
const editDialog = ref(false);
const dataHasSyntaxError = ref(false);
const dataHasSemanticsError = ref(false);
const deleteDialog = ref(false);
const newSubjectInput = ref('');
const semanticErrors = ref('');
const selectedTriples = ref();
const predicateTypeOptions = [{label: 'Named Node', value: 'NamedNode'}];
const settings = useSettings();
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
    subject: translateIRI(store.value, st.subject.value),
    predicate: translateIRI(store.value, st.predicate.value),
    object: translateIRI(store.value, st.object.value),
    quad: st,
  }));
});

const confirmDeleteSelected = () => {
  deleteDialog.value = true;
};

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
  () => getDataForMode(props.sessionMode).isDataUnparseable(),
  async dataIsUnparsable => {
    dataHasSyntaxError.value = dataIsUnparsable;
  },
  {immediate: true}
);

watch(
  () => getDataForMode(props.sessionMode).data.value,
  async dataValue => {
    try {
      semanticErrors.value = '';
      dataHasSemanticsError.value = false;
      nodeManager.value = new JsonLdNodeManager(JSON.stringify(dataValue, null, 2));
      const {rdfStore} = await jsonLdToRdfStore(dataValue);
      store.value = rdfStore;
    } catch (err) {
      dataHasSemanticsError.value = true;
      semanticErrors.value = err instanceof Error ? err.message : String(err);
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
    subject: trip.quad?.subject.value,
    subjectType: trip.quad?.subject?.termType,
    predicate: trip.quad?.predicate.value,
    predicateType: trip.quad?.predicate?.termType,
    object: trip.quad?.object.value,
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

function onRowClick(event: any) {
  const subject = event.data.subject;
  const predicate = event.data.predicate;
  const object = event.data.object;

  const path = nodeManager.value?.findTriplePath(subject, predicate, object);
  if (path) {
    emit('zoom_into_path', path!);
  }
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

function translateIRI(store, iriTerm) {
  if (!settings.value.rdf.compactMode) {
    return iriTerm;
  }
  // If the term is null/undefined, return empty string
  if (!iriTerm) return '';

  // Extract string value if the term is an rdflib object
  const iri = typeof iriTerm === 'string' ? iriTerm : iriTerm.value;

  if (!iri || typeof iri !== 'string') return iri;

  // Iterate over registered prefixes
  for (const [prefix, namespace] of Object.entries(store.namespaces)) {
    if (typeof namespace === 'string' && iri.startsWith(namespace)) {
      return `${prefix}:${iri.slice(namespace.length)}`;
    }
  }

  return iri; // no match → return full IRI
}

async function jsonLdToRdfStore(jsonLdString: string) {
  const jsonLdDoc = JSON.parse(JSON.stringify(jsonLdString));

  const rdfStore = $rdf.graph();

  if (jsonLdDoc['@context']) {
    for (const [prefix, ns] of Object.entries(jsonLdDoc['@context'])) {
      if (typeof ns === 'string') {
        rdfStore.setPrefixForURI(prefix, ns);
      }
    }
  }

  const baseUri = 'http://example.org/';

  await new Promise<void>((resolve, reject) => {
    $rdf.parse(JSON.stringify(jsonLdString), rdfStore, baseUri, 'application/ld+json', err =>
      err ? reject(err) : resolve()
    );
  });

  return {rdfStore};
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
  pointer-events: auto; /* catches clicks so table can't receive them */
}

.disabled-wrapper > * {
  pointer-events: none; /* block all interaction inside */
  opacity: 0.5; /* visual disabled effect */
}

.panel-tab-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden; /* Add this */
}

/* Target the Tabs component root */
:deep(.p-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

:deep(.p-tablist) {
  flex-shrink: 0;
}

.p-tabpanels {
  padding: 0;
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

:deep(.p-tabpanel) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

:deep(.p-datatable) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.p-datatable-wrapper) {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
