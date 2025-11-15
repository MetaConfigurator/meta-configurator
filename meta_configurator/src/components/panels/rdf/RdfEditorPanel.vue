<template>
  <div>
    <div class="card">
      <Toolbar class="mb-0">
        <template #start>
          <Button label="Add Triple" icon="pi pi-plus" class="mr-2" @click="openNewDialog" />
        </template>
      </Toolbar>
      <DataTable
        :value="tableQuadsRef"
        scrollable
        scroll-height="600px"
        :paginator="true"
        :rows="50"
        rowGroupMode="rowspan"
        groupRowsBy="subject"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[10, 20, 50]"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} triples">
        <Column field="subject" header="Subject" sortable style="min-width: 12rem">
          <template #body="{data}">
            <span
              class="cursor-pointer text-blue-600 underline"
              @click="onCellClick(data, 'subject')">
              {{ data.subject }}
            </span>
          </template>
        </Column>

        <Column field="predicate" header="Predicate" sortable style="min-width: 16rem">
          <template #body="{data}">
            <span
              class="cursor-pointer text-blue-600 underline"
              @click="onCellClick(data, 'predicate')">
              {{ data.predicate }}
            </span>
          </template>
        </Column>

        <Column field="object" header="Object" sortable style="min-width: 16rem">
          <template #body="{data}">
            <span
              class="cursor-pointer text-blue-600 underline"
              @click="onCellClick(data, 'object')">
              {{ data.object }}
            </span>
          </template>
        </Column>
        <Column :exportable="false" style="min-width: 12rem">
          <template #body="selectedItem">
            <Button
              icon="pi pi-pencil"
              variant="outlined"
              rounded
              class="mr-2"
              @click="openEditDialog(selectedItem.data)" />
            <Button
              icon="pi pi-trash"
              variant="outlined"
              rounded
              severity="danger"
              @click="deleteTriple(selectedItem.data)" />
          </template>
        </Column>
      </DataTable>
    </div>
    <Dialog
      v-model:visible="tripleDialog"
      :style="{width: '800px'}"
      header="Triple Details"
      :modal="true">
      <div class="flex flex-col gap-6">
        <!-- Subject -->
        <div>
          <label class="block font-bold mb-3">Subject</label>
          <div class="flex gap-2">
            <!-- Subject Type (NamedNode / BlankNode) -->
            <Select
              v-model="triple.subjectType"
              :options="subjectTypeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-45" />

            <!-- If NamedNode -->
            <template v-if="triple.subjectType === 'NamedNode'">
              <!-- NamedNode selection -->
              <Select
                v-model="triple.subject"
                :options="namedNodes"
                optionLabel="label"
                optionValue="value"
                class="flex-1" />

              <!-- If "Add new…" was selected -->
              <InputText
                v-if="triple.subject === '__new__'"
                v-model="newSubjectInput"
                placeholder="Enter new NamedNode IRI"
                class="flex-1" />
            </template>

            <!-- If BlankNode -->
            <template v-else>
              <InputText v-model.trim="triple.subject" required class="flex-1" />
            </template>
          </div>
        </div>

        <!-- Predicate -->
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

        <!-- Object -->
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
  </div>
</template>
<script setup lang="ts">
import {ref, watch, computed} from 'vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode, useCurrentData} from '@/data/useDataLink';
import * as jsonld from 'jsonld';
import * as $rdf from 'rdflib';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import {JsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';

const props = defineProps<{sessionMode: SessionMode}>();
const nodeManager = ref<JsonLdNodeManager>();
const store = ref<$rdf.IndexedFormula | null>(null);
const tripleDialog = ref(false);
const triple = ref({
  subject: '',
  subjectType: 'NamedNode',
  predicate: '',
  predicateType: 'NamedNode',
  object: '',
  objectType: 'Literal',
  quad: null as any,
});

const subjectTypeOptions = [
  {label: 'Named Node', value: 'NamedNode'},
  {label: 'Blank Node', value: 'BlankNode'},
];

const newSubjectInput = ref('');

const predicateTypeOptions = [{label: 'Named Node', value: 'NamedNode'}];

const objectTypeOptions = [
  {label: 'Named Node', value: 'NamedNode'},
  {label: 'Blank Node', value: 'BlankNode'},
  {label: 'Literal', value: 'Literal'},
];

const namedNodes = computed(() => {
  if (!store.value) return [];

  const nodesSet = new Set<string>();
  store.value.statements.forEach(st => {
    if (st.subject.termType === 'NamedNode') {
      nodesSet.add(st.subject.value);
    }
  });

  const nodes = Array.from(nodesSet).map(n => ({label: n, value: n}));

  // Add special option
  nodes.push({label: '➕ Add new…', value: '__new__'});

  return nodes;
});

const tableQuadsRef = computed(() => {
  if (!store.value) return [];

  return store.value.statements.map((st, index) => ({
    id: index,
    subject: st.subject.value,
    predicate: st.predicate.value,
    object: st.object.value,
    quad: st,
  }));
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
  tripleDialog.value = false;
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
  tripleDialog.value = true;
};

const openEditDialog = (trip: any) => {
  triple.value = {
    subject: trip.subject,
    subjectType: trip.quad?.subject?.termType,
    predicate: trip.predicate,
    predicateType: trip.quad?.predicate?.termType,
    object: trip.object,
    objectType: trip.quad?.object?.termType,
    quad: trip.quad,
  };

  tripleDialog.value = true;
};

const deleteTriple = async trip => {
  if (!store.value) return;
  store.value.remove(trip.quad);
  await updateNodeInJsonLd(trip.subject);
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

  tripleDialog.value = false;
};

function onCellClick(quad, field) {
  const pos = nodeManager.value?.getQuadFieldPosition(quad, field);
  console.log('Clicked cell:', field, 'at', pos);
}

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
</script>

<style scoped>
.card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
