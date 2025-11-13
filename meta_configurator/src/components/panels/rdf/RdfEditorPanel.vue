<template>
  <div>
    <div class="card">
      <Toolbar class="mb-6">
        <template #start>
          <Button label="Add Triple" icon="pi pi-plus" class="mr-2" @click="openNew" />
        </template>
      </Toolbar>
      <DataTable
        :value="tableQuads"
        dataKey="id"
        scrollable
        scroll-height="600px"
        :paginator="true"
        :rows="50"
        rowGroupMode="rowspan"
        groupRowsBy="subject"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[10, 20, 50]"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} products">
        <Column field="subject" header="Subject" sortable style="min-width: 12rem"></Column>
        <Column field="predicate" header="Predicate" sortable style="min-width: 16rem"></Column>
        <Column field="object" header="Object" sortable style="min-width: 16rem"></Column>
        <Column :exportable="false" style="min-width: 12rem">
          <template #body="slotProps">
            <Button
              icon="pi pi-pencil"
              variant="outlined"
              rounded
              class="mr-2"
              @click="editTriple(slotProps.data)" />
            <Button
              icon="pi pi-trash"
              variant="outlined"
              rounded
              severity="danger"
              @click="deleteTriple(slotProps.data)" />
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
        <div>
          <label for="subject" class="block font-bold mb-3">Subject</label>
          <div class="flex gap-2">
            <Select
              v-model="triple.subjectType"
              :options="subjectTypeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-40" />
            <InputText
              v-model.trim="triple.subject"
              required
              placeholder="Enter subject (URI or _blank)"
              class="flex-1" />
          </div>
        </div>
        <div>
          <label for="predicate" class="block font-bold mb-3">Predicate</label>
          <div class="flex gap-2">
            <Select
              v-model="triple.predicateType"
              :options="predicateTypeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-40" />
            <InputText
              v-model.trim="triple.predicate"
              required
              placeholder="Enter predicate (URI only)"
              class="flex-1" />
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
              class="w-40" />
            <InputText
              v-model.trim="triple.object"
              required
              placeholder="Enter object (URI or literal)"
              class="flex-1" />
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
import {getDataForMode} from '@/data/useDataLink';
import * as jsonld from 'jsonld';
import * as $rdf from 'rdflib';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';

const props = defineProps<{sessionMode: SessionMode}>();

// Global store
const store = ref<$rdf.IndexedFormula | null>(null);
const jsonLdText = ref<string>(''); // Final JSON-LD variable
const update = ref(false);
const submitted = ref(false);
const tripleDialog = ref(false);
const triple = ref({
  subject: '',
  subjectType: 'URIRef',
  predicate: '',
  predicateType: 'URIRef',
  object: '',
  objectType: 'Literal',
});

const subjectTypeOptions = [
  {label: 'URIRef', value: 'URIRef'},
  {label: 'BlankNode', value: 'BNode'},
];

const predicateTypeOptions = [{label: 'URIRef', value: 'URIRef'}];

const objectTypeOptions = [
  {label: 'URIRef', value: 'URIRef'},
  {label: 'BlankNode', value: 'BNode'},
  {label: 'Literal', value: 'Literal'},
];

const tableQuads = computed(() => {
  if (!store.value) return [];
  return store.value.statements.map((st, index) => ({
    id: index,
    subject: st.subject.value,
    predicate: st.predicate.value,
    object: st.object.value,
    quad: st,
  }));
});

// Watch for session mode data and initialize store
watch(
  () => getDataForMode(props.sessionMode).data.value,
  async dataValue => {
    try {
      const {rdfStore} = await jsonLdToRdfStore(dataValue);
      store.value = rdfStore;
      update.value = true;
      //await updateJsonLdFromStore();
    } catch (err) {
      console.error('Error converting JSON-LD to RDF:', err);
    }
  },
  {immediate: true}
);

const hideDialog = () => {
  tripleDialog.value = false;
  submitted.value = false;
};

const openNew = () => {
  triple.value = {};
  submitted.value = false;
  tripleDialog.value = true;
};

const editTriple = (trip: any) => {
  // Determine types based on the RDFLib quad termTypes
  const subjType = trip.quad?.subject?.termType === 'BlankNode' ? 'BNode' : 'URIRef';
  const predType = 'URIRef'; // predicates are always URIRef
  const objTermType = trip.quad?.object?.termType;

  let objType = 'Literal';
  if (objTermType === 'BlankNode') objType = 'BNode';
  else if (objTermType === 'NamedNode') objType = 'URIRef';

  triple.value = {
    subject: trip.subject,
    subjectType: subjType,
    predicate: trip.predicate,
    predicateType: predType,
    object: trip.object,
    objectType: objType,
    quad: trip.quad, // store original quad for updating
  };

  tripleDialog.value = true;
};

const deleteTriple = trip => {
  if (!store.value) return;

  console.log('Attempting to delete triple:', trip);

  // Build nodes for subject, predicate, object
  const subjNode = $rdf.sym(trip.subject); // subject is always NamedNode

  // Predicate: detect if NamedNode or Literal
  const predNode =
    trip.predicate.startsWith('http://') ||
    trip.predicate.startsWith('https://') ||
    trip.predicate.startsWith('_:')
      ? $rdf.sym(trip.predicate)
      : $rdf.literal(trip.predicate);

  // Object: detect NamedNode or Literal
  const objNode =
    trip.object.startsWith('http://') ||
    trip.object.startsWith('https://') ||
    trip.object.startsWith('_:')
      ? $rdf.sym(trip.object)
      : $rdf.literal(trip.object);

  // Remove all matching statements in the store
  store.value.removeMatches(subjNode, predNode, objNode, $rdf.defaultGraph());

  console.log('Deletion completed. Store now has', store.value.statements.length, 'statements.');
};

// const deleteTriple = (trip) => {
//   if (!store.value) return;

//   const toRemove = store.value.statements.find(
//     st =>
//       st.subject.value === trip.subject &&
//       st.predicate.value === trip.predicate &&
//       st.object.value === trip.object
//   );
//   console.log(toRemove);
//   if (toRemove) {
//     console.log(store.value.statements[0]);
//     store.value.removeStatement(toRemove);
//   } else {
//     console.warn('Statement not found for deletion:', trip);
//   }
// };

const saveTriple = () => {
  submitted.value = true;
  if (triple.value.quad) {
    updateQuadInStore(
      triple.value.quad,
      triple.value.subject,
      triple.value.predicate,
      triple.value.object
    );
  } else {
    addQuadToStore(triple.value.subject, triple.value.predicate, triple.value.object);
  }

  tripleDialog.value = false;
  triple.value = {};
};

function addQuadToStore(subject: string, predicate: string, object: string) {
  if (!store.value) return;

  const subjNode =
    triple.value.subjectType === 'BNode' ? $rdf.blankNode(subject) : $rdf.sym(subject);

  const predNode = $rdf.sym(predicate); // predicate is always URIRef

  let objNode;
  if (triple.value.objectType === 'Literal') {
    objNode = $rdf.literal(object);
  } else if (triple.value.objectType === 'BNode') {
    objNode = $rdf.blankNode(object);
  } else {
    objNode = $rdf.sym(object);
  }

  const newQuad = new $rdf.Statement(subjNode, predNode, objNode, $rdf.defaultGraph());

  store.value.add(newQuad);
}

async function jsonLdToRdfStore(jsonLdString: string) {
  const jsonLdDoc = JSON.parse(JSON.stringify(jsonLdString));
  const nquads = (await jsonld.toRDF(jsonLdDoc, {format: 'application/n-quads'})) as string;

  const rdfStore = $rdf.graph();
  const baseUri = 'http://example.org/';

  await new Promise<void>((resolve, reject) => {
    $rdf.parse(nquads, rdfStore, baseUri, 'application/n-quads', err => {
      if (err) reject(err);
      else resolve();
    });
  });

  return {rdfStore};
}

// Convert RDF store to JSON-LD
async function updateJsonLdFromStore() {
  if (!store.value) return;

  const nquads = store.value.toNT();
  const jsonldDoc = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});

  jsonLdText.value = JSON.stringify(jsonldDoc, null, 2);
}

function updateQuadInStore(
  oldQuad: $rdf.Statement,
  subject?: string,
  predicate?: string,
  object?: string
) {
  if (!store.value) return;

  const idx = store.value.statements.indexOf(oldQuad);
  if (idx === -1) return;

  // Subject is always a NamedNode
  const newSubject = subject ? $rdf.sym(subject) : oldQuad.subject;

  // Predicate can be NamedNode or Literal, detect from input
  const newPredicate = predicate
    ? predicate.startsWith('http://') ||
      predicate.startsWith('https://') ||
      predicate.startsWith('_:')
      ? $rdf.sym(predicate)
      : $rdf.literal(predicate)
    : oldQuad.predicate;

  // Object can be NamedNode or Literal
  let newObject;
  if (object) {
    if (oldQuad.object.termType === 'Literal') {
      // Preserve literal type if object was a literal
      // Optional: detect numbers/boolean and assign XSD datatypes
      if (!isNaN(Number(object))) {
        newObject = $rdf.literal(object, $rdf.sym('http://www.w3.org/2001/XMLSchema#double'));
      } else if (object === 'true' || object === 'false') {
        newObject = $rdf.literal(object, $rdf.sym('http://www.w3.org/2001/XMLSchema#boolean'));
      } else {
        newObject = $rdf.literal(object, oldQuad.object.language || undefined);
      }
    } else {
      // NamedNode
      newObject =
        object.startsWith('http://') || object.startsWith('https://') || object.startsWith('_:')
          ? $rdf.sym(object)
          : $rdf.literal(object);
    }
  } else {
    newObject = oldQuad.object;
  }

  const newQuad = new $rdf.Statement(newSubject, newPredicate, newObject, oldQuad.graph);

  // If subject changes, remove + insert in correct sorted position
  if (newSubject.value !== oldQuad.subject.value) {
    store.value.statements.splice(idx, 1);
    addQuadToStore(newSubject.value, newPredicate.value, newObject.value);
  } else {
    // In-place update to preserve order
    store.value.statements.splice(idx, 1, newQuad);
  }
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
