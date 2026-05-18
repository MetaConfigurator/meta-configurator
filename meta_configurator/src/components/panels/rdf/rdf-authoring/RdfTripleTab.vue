<template>
  <DataTable
    :class="{'disabled-wrapper': !dataIsInJsonLd || dataIsUnparsable || parsingErrors.length > 0}"
    :value="items"
    :rowGroupMode="groupBySubject ? 'subheader' : undefined"
    :groupRowsBy="groupBySubject ? 'subject' : undefined"
    :sortField="groupBySubject ? 'subject' : undefined"
    :sortOrder="groupBySubject ? 1 : undefined"
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
    :globalFilterFields="['subject', 'predicate', 'object']"
    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
    :rowsPerPageOptions="[10, 20, 50]"
    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} triples">
    <template v-if="groupBySubject" #groupheader="{data}">
      <span class="grouped-subject">{{ data.subject }}</span>
    </template>
    <template #header>
      <RdfTripleToolbar
        :hasSelection="Boolean(selectedTriple)"
        :hasItems="items.length > 0"
        :hasFilteredRows="filteredItems.length > 0"
        :globalFilterValue="filters?.global?.value ?? null"
        :exportMenuItems="exportMenuItems"
        @add="openNewDialog"
        @edit="openEditDialog"
        @delete="confirmDeleteSelected"
        @sparql="openSparqlDialog"
        @visualize="openVisualizer"
        @clear-filters="clearFilter"
        @update:globalFilterValue="updateGlobalFilter" />
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
      <template #body="{data}">
        {{ formatCellValue(data.object) }}
      </template>
      <template #filter="{filterModel, filterCallback}">
        <InputText
          v-model="filterModel.value"
          type="text"
          @input="filterCallback()"
          placeholder="Search by Object" />
      </template>
    </Column>
  </DataTable>
  <RdfTripleDetail
    ref="rdfTripleDetail"
    :triple="triple"
    :disableSubject="disableSubject"
    @saved="handleTripleSaved" />
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
    :style="{width: '80vw', height: '80vh'}"
    :contentStyle="{height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}">
    <SparqlDialog />
  </Dialog>
  <Dialog
    v-model:visible="visualizerDialog"
    header="Visualization"
    modal
    maximizable
    :style="{width: '80vw', height: '80vh'}"
    :contentStyle="{height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}">
    <RdfVisualizer
      ref="visualizerRef"
      :statements="filteredStatements"
      :readOnly="false"
      :dataIsUnparsable="props.dataIsUnparsable"
      :dataIsInJsonLd="props.dataIsInJsonLd"
      @cancel-render="closeVisualizer"
      @edit-triple="openTripleEditor"
      @add-node="openNewNodeFromVisualizer" />
  </Dialog>
</template>

<script setup lang="ts">
import {nextTick} from 'vue';
import {ref, computed, watch} from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {FilterMatchMode} from '@primevue/core/api';
import type {Path} from '@/utility/path';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import SparqlDialog from '@/components/panels/rdf/sparql-editor/SparqlDialog.vue';
import RdfVisualizer from '@/components/panels/rdf/visualizer/RdfVisualizer.vue';
import {useErrorService} from '@/utility/errorServiceInstance';
import {
  downloadFile,
  formatCellValue,
  RdfChangeType,
  RdfTermType,
} from '@/components/panels/rdf/rdfUtils';
import {
  TripleEditorService,
  type TripleTransferObject,
} from '@/components/panels/rdf/tripleEditorService';
import RdfTripleDetail from '@/components/panels/rdf/rdf-authoring/RdfTripleDetail.vue';
import RdfTripleToolbar from '@/components/panels/rdf/rdf-authoring/RdfTripleToolbar.vue';
import {useSettings} from '@/settings/useSettings';
import {RdfMediaType} from '../rdfEnums';

const settings = useSettings();
const groupBySubject = computed(() => settings.value.rdf.groupBySubject);

const props = defineProps<{
  dataIsUnparsable: boolean;
  dataIsInJsonLd: boolean;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path: Path): void;
}>();

const first = ref(0);
const rowsPerPage = ref(50);
const dataSession = getSessionForMode(SessionMode.DataEditor);

const deleteDialog = ref(false);
const sparqlDialog = ref(false);
const visualizerDialog = ref(false);
const visualizerRef = ref<InstanceType<typeof RdfVisualizer> | null>(null);

const loading = ref(false);
const rdfTripleDetail = ref<InstanceType<typeof RdfTripleDetail> | null>(null);
const disableSubject = ref(false);
const isUserSelection = ref(false);
const selectedTriple = ref();

const filters = ref();
const exportMenuItems = [
  {
    label: 'Turtle',
    icon: 'pi pi-file',
    command: () => exportAs(RdfMediaType.Turtle),
  },
  {
    label: 'N-Triples',
    icon: 'pi pi-file',
    command: () => exportAs(RdfMediaType.NTriples),
  },
  {
    label: 'RDF/XML',
    icon: 'pi pi-file',
    command: () => exportAs(RdfMediaType.RdfXml),
  },
];

const triple = ref<TripleTransferObject>({
  subject: '',
  subjectType: RdfTermType.NamedNode,
  predicate: '',
  predicateType: RdfTermType.NamedNode,
  object: '',
  objectType: RdfTermType.Literal,
  objectDatatype: '',
});

const initFilters = () => {
  filters.value = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
    subject: {value: null, matchMode: FilterMatchMode.CONTAINS},
    predicate: {value: null, matchMode: FilterMatchMode.CONTAINS},
    object: {value: null, matchMode: FilterMatchMode.CONTAINS},
  };
};

const items = computed(() => {
  return rdfStoreManager.statements.value.map((statement, index) => ({
    id: index,
    subject: translateIRI(statement.subject.value),
    predicate: translateIRI(statement.predicate.value),
    object: translateIRI(statement.object.value),
    statement: statement,
  }));
});

function updateGlobalFilter(value: string | null) {
  filters.value = {
    ...filters.value,
    global: {
      ...(filters.value?.global ?? {}),
      value,
    },
  };
}

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

const filteredItems = computed(() => {
  const currentItems = items.value;
  const currentFilters = filters.value ?? {};

  const globalNeedle = getFilterNeedle(currentFilters.global);
  const subjectNeedle = getFilterNeedle(currentFilters.subject);
  const predicateNeedle = getFilterNeedle(currentFilters.predicate);
  const objectNeedle = getFilterNeedle(currentFilters.object);

  if (!globalNeedle && !subjectNeedle && !predicateNeedle && !objectNeedle) {
    return currentItems;
  }

  return currentItems.filter(row => {
    const subject = String(row.subject ?? '');
    const predicate = String(row.predicate ?? '');
    const object = String(row.object ?? '');

    if (subjectNeedle && !matchesContains(subject, subjectNeedle)) return false;
    if (predicateNeedle && !matchesContains(predicate, predicateNeedle)) return false;
    if (objectNeedle && !matchesContains(object, objectNeedle)) return false;

    if (globalNeedle) {
      return (
        matchesContains(subject, globalNeedle) ||
        matchesContains(predicate, globalNeedle) ||
        matchesContains(object, globalNeedle)
      );
    }

    return true;
  });
});

const filteredStatements = computed(() => filteredItems.value.map(row => row.statement));

const confirmDeleteSelected = () => {
  deleteDialog.value = true;
};

const openVisualizer = () => {
  visualizerDialog.value = true;
};

const openSparqlDialog = () => {
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
    subjectType: RdfTermType.NamedNode,
    predicate: '',
    predicateType: RdfTermType.NamedNode,
    object: '',
    objectType: RdfTermType.Literal,
    objectDatatype: '',
    statement: undefined,
  };
  disableSubject.value = false;
  rdfTripleDetail.value?.open();
};

const openNewNodeFromVisualizer = () => {
  openNewDialog();
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
    objectDatatype:
      st.object.termType === RdfTermType.Literal ? st.object.datatype?.value ?? '' : '',
    statement: selectedTriple.value.statement,
  };

  disableSubject.value = false;
  rdfTripleDetail.value?.open();
};

function openTripleEditor(payload: TripleTransferObject) {
  if (payload.statement) {
    const st = payload.statement;
    triple.value = {
      subject: st.subject.value,
      subjectType: st.subject.termType,
      predicate: st.predicate.value,
      predicateType: st.predicate.termType,
      object: st.object.value,
      objectType: st.object.termType,
      objectDatatype:
        st.object.termType === RdfTermType.Literal ? st.object.datatype?.value ?? '' : '',
      statement: st,
    };
    disableSubject.value = false;
  } else {
    triple.value = {
      subject: payload.subject,
      subjectType: payload.subjectType,
      predicate: payload.predicate,
      predicateType: payload.predicateType,
      object: payload.object,
      objectType: payload.objectType,
      objectDatatype: payload.objectDatatype ?? '',
      statement: undefined,
    };
    disableSubject.value = true;
  }
  rdfTripleDetail.value?.open();
}

function handleTripleSaved(payload: {action: RdfChangeType; triple: TripleTransferObject}) {
  loading.value = true;
  if (payload.action === RdfChangeType.Add) {
    selectedTriple.value = null;
    if (payload.triple.subject) {
      visualizerRef.value?.refreshAndSelectNode(payload.triple.subject);
    }
  }
  visualizerRef.value?.refreshSelectedNodeFromStore();
}

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

watch(
  () => rdfStoreManager.statements.value,
  () => {
    loading.value = false;
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

function getFilterNeedle(filterMeta: any): string | null {
  const raw =
    filterMeta?.value ??
    (Array.isArray(filterMeta?.constraints) ? filterMeta.constraints[0]?.value : null);
  const text = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  return text.length ? text.toLocaleLowerCase() : null;
}

function matchesContains(value: string, needle: string): boolean {
  return value.toLocaleLowerCase().includes(needle);
}

function exportAs(format: string) {
  const serialized = rdfStoreManager.exportAs(format);
  downloadFile(serialized.content, format);
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
  cursor: not-allowed;
  pointer-events: auto;
}

.disabled-wrapper > * {
  pointer-events: none;
  opacity: 0.5;
}

.grouped-subject {
  font-weight: bold;
}
</style>
