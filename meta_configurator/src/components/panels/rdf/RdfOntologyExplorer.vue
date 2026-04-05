<template>
  <div class="rdf-ontology-explorer p-3">
    <div class="explorer-layout">
      <div class="prefix-pane">
        <Listbox
          v-model="selectedPrefix"
          :options="prefixOptions"
          optionLabel="label"
          optionValue="value"
          filter
          class="w-full prefix-listbox"
          :disabled="prefixOptions.length === 0"
          :listStyle="{height: '100%'}" />
      </div>
      <div v-if="selectedPrefix" class="content-pane">
        <Accordion v-model:value="activeAccordion" class="mb-3">
          <AccordionPanel value="ontologyControls">
            <AccordionHeader>Ontology Controls</AccordionHeader>
            <AccordionContent>
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"
                  >Ontology URL (Supported RDF serializations: RDF/XML, Turtle, N-Triples, N3,
                  JSON-LD)</label
                >
                <InputText
                  v-model.trim="ontologyUrl"
                  class="w-full"
                  :disabled="!selectedPrefix || isDownloading" />
                <div class="flex gap-2 items-center flex-wrap">
                  <Button
                    label="Download"
                    icon="pi pi-download"
                    severity="secondary"
                    :loading="isDownloading"
                    :disabled="!selectedPrefix || !ontologyUrl || isUploading"
                    @click="downloadAndCacheOntology" />
                  <FileUpload
                    ref="ontologyFileUploadRef"
                    mode="basic"
                    name="ontologyFile"
                    chooseLabel="Upload File"
                    chooseIcon="pi pi-upload"
                    :auto="true"
                    :customUpload="true"
                    :multiple="false"
                    :accept="RDF_FILE_ACCEPT"
                    :disabled="!selectedPrefix || isDownloading || isUploading"
                    @select="onOntologyFileSelected" />
                  <Button
                    label="Refresh"
                    icon="pi pi-refresh"
                    variant="text"
                    :loading="isQuerying"
                    :disabled="!selectedCacheEntry"
                    @click="loadOntologyCards(true)" />
                  <Button
                    label="Delete"
                    icon="pi pi-trash"
                    severity="danger"
                    variant="text"
                    :disabled="!selectedPrefix || !selectedCacheEntry"
                    @click="confirmDeleteCachedOntology" />
                </div>
                <small v-if="selectedCacheEntry" class="text-muted-color">
                  Cached on {{ formatDate(selectedCacheEntry.fetchedAt) }}
                </small>
              </div>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>

        <Message v-if="statusMessage" :severity="statusSeverity" :closable="true" class="mb-3">
          {{ statusMessage }}
        </Message>

        <div v-if="isQuerying" class="text-sm text-muted-color">Loading terms...</div>
        <div v-else class="table-wrapper">
          <Tabs v-model:value="activePropertyTab" class="ontology-tabs">
            <TabList>
              <Tab value="DatatypeProperty" :disabled="!isDatatypeTabEnabled">DatatypeProperty</Tab>
              <Tab value="ObjectProperty" :disabled="!isObjectPropertyTabEnabled"
                >ObjectProperty</Tab
              >
              <Tab value="Class" :disabled="!isClassTabEnabled">Class</Tab>
              <Tab value="CustomQuery">Custom Query</Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="DatatypeProperty">
                <div class="table-search mb-2">
                  <InputText
                    v-model.trim="tableSearch"
                    placeholder="Search properties"
                    class="w-full" />
                </div>
                <DataTable
                  ref="datatypeTableRef"
                  :value="filteredDatatypeRows"
                  v-model:first="datatypeFirst"
                  v-model:selection="selectedDatatypeRow"
                  selectionMode="single"
                  dataKey="about"
                  size="small"
                  stripedRows
                  paginator
                  :rows="ROWS_PER_PAGE"
                  scrollable
                  resizableColumns
                  scrollHeight="flex">
                  <Column selectionMode="single" headerStyle="width: 3rem" />
                  <Column field="about" header="rdf:about">
                    <template #body="{data}">
                      <a
                        class="ontology-term-link"
                        :href="buildOntologyTermHref(data.about)"
                        target="_blank"
                        rel="noopener noreferrer">
                        {{ termNameFromIri(data.about) }}
                      </a>
                    </template>
                  </Column>
                  <Column field="comment" header="Comment">
                    <template #body="{data}">
                      <div class="wrapped-comment">{{ data.comment }}</div>
                    </template>
                  </Column>
                </DataTable>
              </TabPanel>
              <TabPanel value="ObjectProperty">
                <div class="table-search mb-2">
                  <InputText
                    v-model.trim="tableSearch"
                    placeholder="Search properties"
                    class="w-full" />
                </div>
                <DataTable
                  ref="objectTableRef"
                  :value="filteredObjectRows"
                  v-model:first="objectFirst"
                  v-model:selection="selectedObjectRow"
                  selectionMode="single"
                  dataKey="about"
                  size="small"
                  stripedRows
                  paginator
                  :rows="ROWS_PER_PAGE"
                  scrollable
                  resizableColumns
                  scrollHeight="flex">
                  <Column selectionMode="single" headerStyle="width: 3rem" />
                  <Column field="about" header="rdf:about">
                    <template #body="{data}">
                      <a
                        class="ontology-term-link"
                        :href="buildOntologyTermHref(data.about)"
                        target="_blank"
                        rel="noopener noreferrer">
                        {{ termNameFromIri(data.about) }}
                      </a>
                    </template>
                  </Column>
                  <Column field="comment" header="Comment">
                    <template #body="{data}">
                      <div class="wrapped-comment">{{ data.comment }}</div>
                    </template>
                  </Column>
                </DataTable>
              </TabPanel>
              <TabPanel value="Class">
                <div class="table-search mb-2">
                  <InputText
                    v-model.trim="tableSearch"
                    placeholder="Search classes"
                    class="w-full" />
                </div>
                <DataTable
                  ref="classTableRef"
                  :value="filteredClassRows"
                  v-model:first="classFirst"
                  v-model:selection="selectedClassRow"
                  selectionMode="single"
                  dataKey="about"
                  size="small"
                  stripedRows
                  paginator
                  :rows="ROWS_PER_PAGE"
                  scrollable
                  resizableColumns
                  scrollHeight="flex">
                  <Column selectionMode="single" headerStyle="width: 3rem" />
                  <Column field="about" header="rdf:about">
                    <template #body="{data}">
                      <a
                        class="ontology-term-link"
                        :href="buildOntologyTermHref(data.about)"
                        target="_blank"
                        rel="noopener noreferrer">
                        {{ termNameFromIri(data.about) }}
                      </a>
                    </template>
                  </Column>
                  <Column field="comment" header="Comment">
                    <template #body="{data}">
                      <div class="wrapped-comment">{{ data.comment }}</div>
                    </template>
                  </Column>
                </DataTable>
              </TabPanel>
              <TabPanel value="CustomQuery">
                <div class="flex flex-col gap-2 mb-2 mt-2">
                  <Accordion v-model:value="customQueryAccordion">
                    <AccordionPanel value="editor">
                      <AccordionHeader>SPARQL Query Editor</AccordionHeader>
                      <AccordionContent>
                        <div class="custom-query-editor">
                          <SparqlQueryEditor
                            v-model="customSparqlQuery"
                            :errorLine="customQueryErrorLineNumber"
                            :errorMessage="customQueryErrorMessage" />
                        </div>
                      </AccordionContent>
                    </AccordionPanel>
                  </Accordion>
                  <div class="flex justify-end">
                    <Button
                      label="Run Query"
                      icon="pi pi-play"
                      size="small"
                      :loading="isRunningCustomQuery"
                      :disabled="!selectedCacheEntry || !customSparqlQuery.trim()"
                      @click="runCustomSparqlQuery" />
                  </div>
                </div>
                <div class="table-search mb-2">
                  <InputText
                    v-model.trim="tableSearch"
                    placeholder="Search query results"
                    class="w-full" />
                </div>
                <DataTable
                  :value="filteredCustomQueryRows"
                  v-model:first="customQueryFirst"
                  size="small"
                  stripedRows
                  paginator
                  :rows="ROWS_PER_PAGE"
                  scrollable
                  resizableColumns
                  scrollHeight="flex">
                  <Column
                    v-for="column in customQueryColumns"
                    :key="column"
                    :field="column"
                    :header="column">
                    <template #body="{data}">
                      <button
                        type="button"
                        class="custom-query-cell"
                        :class="{iri: isLikelyIri(normalizePotentialIri(data[column]))}"
                        @click="onCustomQueryValueClick(data[column])">
                        {{ data[column] }}
                      </button>
                    </template>
                  </Column>
                </DataTable>
              </TabPanel>
            </TabPanels>
          </Tabs>
          <div v-if="selectedRowIri" class="selection-bar mt-2">
            <InputText :modelValue="selectedRowIri" class="selection-input" readonly />
            <Button label="Select" icon="pi pi-check" @click="selectCurrentIri" />
          </div>
        </div>
      </div>
      <div v-else class="content-placeholder text-sm text-muted-color">
        Select a prefix from the list to open the ontology panel.
      </div>
    </div>
    <Dialog v-model:visible="deleteDialog" header="Confirm" modal>
      <div class="flex items-center gap-4">
        <i class="pi pi-exclamation-triangle !text-3xl" />
        <span>Are you sure you want to delete the cached ontology for this prefix?</span>
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
          @click="deleteCachedOntology"
          severity="danger" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, toRaw, watch} from 'vue';
import * as $rdf from 'rdflib';
import Listbox from 'primevue/listbox';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Dialog from 'primevue/dialog';
import FileUpload from 'primevue/fileupload';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import {Parser} from 'sparqljs';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';
import SparqlQueryEditor from '@/components/panels/rdf/SparqlQueryEditor.vue';

const props = withDefaults(
  defineProps<{
    initialIri?: string;
    sourceField?: 'Predicate' | 'Object';
  }>(),
  {
    initialIri: '',
    sourceField: 'Predicate',
  }
);
const emit = defineEmits<{
  (e: 'select-iri', iri: string): void;
}>();

const data = getDataForMode(SessionMode.DataEditor);
const selectedPrefix = ref<string | null>(null);
const prefixes = ref<string[]>([]);
const prefixNamespaces = ref<Record<string, string>>({});
const ontologyUrl = ref('');
const isDownloading = ref(false);
const isUploading = ref(false);
const statusMessage = ref('');
const statusSeverity = ref<'success' | 'info' | 'warn' | 'error'>('info');
const isQuerying = ref(false);
const ontologyRows = ref<OntologyRow[]>([]);
const ROWS_PER_PAGE = 100;
const activePropertyTab = ref<'DatatypeProperty' | 'ObjectProperty' | 'Class' | 'CustomQuery'>(
  'ObjectProperty'
);
const tableSearch = ref('');
const selectedDatatypeRow = ref<any | null>(null);
const selectedObjectRow = ref<any | null>(null);
const selectedClassRow = ref<any | null>(null);
const datatypeFirst = ref(0);
const objectFirst = ref(0);
const classFirst = ref(0);
const customQueryFirst = ref(0);
const customSparqlQuery = ref('SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100');
const customQueryRows = ref<CustomQueryRow[]>([]);
const selectedCustomQueryIri = ref('');
const isRunningCustomQuery = ref(false);
const customQueryErrorLineNumber = ref<number | null>(null);
const customQueryErrorMessage = ref<string | null>(null);
const customQueryAccordion = ref<string | null>('editor');
let customQueryValidateTimer: number | null = null;
const pendingInitialIri = ref('');
const isAutoSelectingPrefix = ref(false);
const datatypeTableRef = ref<any | null>(null);
const objectTableRef = ref<any | null>(null);
const classTableRef = ref<any | null>(null);
const activeAccordion = ref<string | null>('ontologyControls');
const deleteDialog = ref(false);
const ontologyFileUploadRef = ref<any | null>(null);

type CachedOntology = {
  ontologyPrefix: string;
  url: string;
  content: string;
  format: string;
  contentType: string;
  fetchedAt: string;
  mergedGraphNTriples?: string;
  ontologyQueryResults?: OntologyRow[];
  queryResultsFetchedAt?: string;
};

type CachedGlobalGraph = {
  id: 'global';
  nTriples: string;
  updatedAt: string;
};

type OntologyRow = {
  about: string;
  comment: string;
  propertyType: 'ObjectProperty' | 'DatatypeProperty' | 'Class';
};

type CustomQueryRow = Record<string, string>;

const INDEXED_DB_NAME = 'rdf_ontology_cache_db';
const INDEXED_DB_VERSION = 2;
const INDEXED_DB_STORE = 'ontology_sources';
const LEGACY_INDEXED_DB_STORE = 'ontologies';
const INDEXED_DB_GRAPH_STORE = 'ontology_graphs';
const ACCEPT_RDF_HEADER =
  'application/rdf+xml, text/turtle, application/x-turtle, application/n-triples, text/n3, application/ld+json, application/json, application/xml, text/xml, text/plain';
const RDF_FILE_ACCEPT =
  '.rdf,.owl,.xml,.ttl,.nt,.n3,.jsonld,.json,application/rdf+xml,text/turtle,application/x-turtle,application/n-triples,text/n3,application/ld+json,application/json,application/xml,text/xml,text/plain';
const loadedCacheEntry = ref<CachedOntology | null>(null);
let ontologyDbPromise: Promise<IDBDatabase> | null = null;
let prefixLookupRequestId = 0;

const prefixOptions = computed(() =>
  prefixes.value.map(prefix => ({label: prefix, value: prefix}))
);
const selectedCacheEntry = computed(() => {
  if (!selectedPrefix.value) return null;
  const entry = loadedCacheEntry.value;
  if (!entry || entry.ontologyPrefix !== selectedPrefix.value) return null;
  return entry;
});

const datatypeRows = computed(() =>
  ontologyRows.value.filter(row => row.propertyType === 'DatatypeProperty')
);
const objectRows = computed(() =>
  ontologyRows.value.filter(row => row.propertyType === 'ObjectProperty')
);
const classRows = computed(() => ontologyRows.value.filter(row => row.propertyType === 'Class'));
const filteredDatatypeRows = computed(() => filterRows(datatypeRows.value, tableSearch.value));
const filteredObjectRows = computed(() => filterRows(objectRows.value, tableSearch.value));
const filteredClassRows = computed(() => filterRows(classRows.value, tableSearch.value));
const filteredCustomQueryRows = computed(() =>
  filterCustomQueryRows(customQueryRows.value, tableSearch.value)
);
const customQueryColumns = computed(() => {
  const columns = new Set<string>();
  for (const row of customQueryRows.value) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return Array.from(columns);
});
const activeSelectedRow = computed(() =>
  activePropertyTab.value === 'DatatypeProperty'
    ? selectedDatatypeRow.value
    : activePropertyTab.value === 'ObjectProperty'
    ? selectedObjectRow.value
    : activePropertyTab.value === 'Class'
    ? selectedClassRow.value
    : null
);
const isDatatypeTabEnabled = computed(() => props.sourceField === 'Predicate');
const isObjectPropertyTabEnabled = computed(() => props.sourceField === 'Predicate');
const isClassTabEnabled = computed(() => props.sourceField === 'Object');
const selectedRowIri = computed(() => {
  if (activePropertyTab.value === 'CustomQuery') {
    return selectedCustomQueryIri.value;
  }

  const row = activeSelectedRow.value;
  if (!row?.about) return '';

  const namespace = selectedPrefix.value ? prefixNamespaces.value[selectedPrefix.value] ?? '' : '';

  if (!namespace) return row.about;
  if (row.about.startsWith(namespace)) return row.about;
  return `${namespace}${termNameFromIri(row.about)}`;
});

function resetTablePaging() {
  datatypeFirst.value = 0;
  objectFirst.value = 0;
  classFirst.value = 0;
  customQueryFirst.value = 0;
}

watch(
  () => data.data.value,
  async dataValue => {
    const resolvedContext = await jsonLdContextManager.syncFromData(dataValue);
    prefixNamespaces.value = extractPrefixNamespaces(resolvedContext);
    prefixes.value = Object.keys(prefixNamespaces.value);

    if (selectedPrefix.value && !prefixes.value.includes(selectedPrefix.value)) {
      selectedPrefix.value = null;
    }

    tryAutoSelectFromInitialIri();
  },
  {immediate: true, deep: true}
);

watch(
  () => props.initialIri,
  iri => {
    pendingInitialIri.value = normalizeIri(iri);
    tryAutoSelectFromInitialIri();
  },
  {immediate: true}
);

watch(
  () => tableSearch.value,
  () => {
    resetTablePaging();
  }
);

watch(
  selectedPrefix,
  async newPrefix => {
    const requestId = ++prefixLookupRequestId;
    if (isAutoSelectingPrefix.value) {
      isAutoSelectingPrefix.value = false;
    }
    statusMessage.value = '';
    ontologyRows.value = [];
    customQueryRows.value = [];
    selectedCustomQueryIri.value = '';
    selectedDatatypeRow.value = null;
    selectedObjectRow.value = null;
    selectedClassRow.value = null;
    resetTablePaging();
    tableSearch.value = '';
    loadedCacheEntry.value = null;
    if (!newPrefix) {
      ontologyUrl.value = '';
      return;
    }
    try {
      ontologyUrl.value = '';
      const cachedEntry = await getOntologyFromIndexedDb(newPrefix);
      if (requestId !== prefixLookupRequestId) return;
      loadedCacheEntry.value = cachedEntry;
      ontologyUrl.value = cachedEntry?.url ?? '';
      if (cachedEntry) {
        await loadOntologyCards();
      }
    } catch (error: any) {
      if (requestId !== prefixLookupRequestId) return;
      setStatus(error?.message ?? 'Failed to read cached ontology from IndexedDB.', 'warn');
    }
  },
  {immediate: true}
);

watch(
  [ontologyRows, selectedPrefix],
  () => {
    if (!pendingInitialIri.value) return;
    trySelectRowForIri(pendingInitialIri.value);
  },
  {deep: false}
);

watch(
  () => props.sourceField,
  sourceField => {
    activePropertyTab.value = sourceField === 'Object' ? 'Class' : 'ObjectProperty';
    selectedDatatypeRow.value = null;
    selectedObjectRow.value = null;
    selectedClassRow.value = null;
  },
  {immediate: true}
);

watch(
  selectedCacheEntry,
  entry => {
    activeAccordion.value = entry ? null : 'ontologyControls';
  },
  {immediate: true}
);

async function downloadAndCacheOntology() {
  if (!selectedPrefix.value) {
    setStatus('Please select a prefix first.', 'warn');
    return;
  }
  const ontologyPrefix = selectedPrefix.value;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(ontologyUrl.value);
  } catch {
    setStatus('Please enter a valid URL.', 'warn');
    return;
  }

  isDownloading.value = true;
  setStatus('');

  try {
    const {response, usedProxy} = await fetchOntologyWithCorsFallback(parsedUrl.toString());
    if (!response.ok) {
      throw new Error(`Download failed with HTTP ${response.status} for ${parsedUrl.toString()}.`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    const format = detectRdfFormat(contentType, parsedUrl.toString());
    if (!format) {
      throw new Error(`Only RDF files are supported (${parsedUrl.toString()}).`);
    }
    const content = await response.text();
    const store = await parseRdfToStore(content, parsedUrl.toString(), format);
    const mergedGraphNTriples = serializeStoreToNTriples(store);

    const cacheEntry: CachedOntology = {
      ontologyPrefix,
      url: parsedUrl.toString(),
      content,
      format,
      contentType,
      fetchedAt: new Date().toISOString(),
      mergedGraphNTriples,
    };
    loadedCacheEntry.value = cacheEntry;
    await putOntologyToIndexedDb(cacheEntry);
    await loadOntologyCards();

    setStatus(
      `Ontology for prefix "${ontologyPrefix}" was downloaded and cached in IndexedDB${
        usedProxy ? ' (via local proxy)' : ''
      }.`,
      'success'
    );
  } catch (error: any) {
    setStatus(error?.message ?? 'Failed to download ontology.', 'error');
  } finally {
    isDownloading.value = false;
  }
}

async function onOntologyFileSelected(event: any) {
  const file = Array.isArray(event?.files) ? event.files[0] : null;
  if (!file) return;

  if (!selectedPrefix.value) {
    setStatus('Please select a prefix first.', 'warn');
    ontologyFileUploadRef.value?.clear?.();
    return;
  }
  const ontologyPrefix = selectedPrefix.value;

  isUploading.value = true;
  setStatus('');

  try {
    const contentType = file.type || 'application/octet-stream';
    const format = detectRdfFormat(contentType, file.name);
    if (!format) {
      throw new Error('Only RDF files are supported.');
    }

    const content = await file.text();
    const fileUrl = `file://${encodeURIComponent(file.name)}`;
    const store = await parseRdfToStore(content, fileUrl, format);
    const mergedGraphNTriples = serializeStoreToNTriples(store);

    const cacheEntry: CachedOntology = {
      ontologyPrefix,
      url: fileUrl,
      content,
      format,
      contentType,
      fetchedAt: new Date().toISOString(),
      mergedGraphNTriples,
    };
    loadedCacheEntry.value = cacheEntry;
    await putOntologyToIndexedDb(cacheEntry);
    await loadOntologyCards();

    setStatus(
      `Ontology file "${file.name}" for prefix "${ontologyPrefix}" was uploaded and cached in IndexedDB.`,
      'success'
    );
  } catch (error: any) {
    setStatus(error?.message ?? 'Failed to upload ontology file.', 'error');
  } finally {
    isUploading.value = false;
    ontologyFileUploadRef.value?.clear?.();
  }
}

async function fetchOntologyWithCorsFallback(
  targetUrl: string
): Promise<{response: Response; usedProxy: boolean}> {
  try {
    const directResponse = await fetch(targetUrl, {
      headers: {Accept: ACCEPT_RDF_HEADER},
    });
    return {response: directResponse, usedProxy: false};
  } catch {
    const proxyUrl = `/api/rdf-proxy?url=${encodeURIComponent(targetUrl)}`;
    const proxiedResponse = await fetch(proxyUrl, {
      headers: {Accept: ACCEPT_RDF_HEADER},
    });
    return {response: proxiedResponse, usedProxy: true};
  }
}

function detectRdfFormat(contentTypeHeader: string, url: string): string | null {
  const contentType = contentTypeHeader.split(';')[0]!.trim().toLowerCase();
  const normalizedUrl = url.toLowerCase();

  if (contentType === 'application/rdf+xml') return 'application/rdf+xml';
  if (contentType === 'application/xml' || contentType === 'text/xml') return 'application/rdf+xml';
  if (contentType === 'text/turtle' || contentType === 'application/x-turtle') return 'text/turtle';
  if (contentType === 'application/n-triples') return 'application/n-triples';
  if (contentType === 'text/n3') return 'text/n3';
  if (contentType === 'application/ld+json') return 'application/ld+json';
  if (contentType === 'application/json') return 'application/ld+json';

  if (contentType === 'text/plain' || contentType === 'application/octet-stream') {
    if (normalizedUrl.endsWith('.nt')) return 'application/n-triples';
    if (normalizedUrl.endsWith('.ttl')) return 'text/turtle';
    if (normalizedUrl.endsWith('.n3')) return 'text/n3';
    if (
      normalizedUrl.endsWith('.rdf') ||
      normalizedUrl.endsWith('.owl') ||
      normalizedUrl.endsWith('.xml')
    ) {
      return 'application/rdf+xml';
    }
    if (normalizedUrl.endsWith('.jsonld') || normalizedUrl.endsWith('.json'))
      return 'application/ld+json';
  }

  if (
    normalizedUrl.endsWith('.rdf') ||
    normalizedUrl.endsWith('.owl') ||
    normalizedUrl.endsWith('.xml')
  ) {
    return 'application/rdf+xml';
  }
  if (normalizedUrl.endsWith('.ttl')) return 'text/turtle';
  if (normalizedUrl.endsWith('.nt')) return 'application/n-triples';
  if (normalizedUrl.endsWith('.n3')) return 'text/n3';
  if (normalizedUrl.endsWith('.jsonld') || normalizedUrl.endsWith('.json'))
    return 'application/ld+json';

  return null;
}

function parseRdfToStore(content: string, baseUri: string, format: string): Promise<$rdf.Formula> {
  return new Promise((resolve, reject) => {
    const store = $rdf.graph();
    $rdf.parse(content, store as $rdf.Formula, baseUri, format, err => {
      if (err) {
        reject(new Error(`The ontology content at "${baseUri}" is not valid RDF.`));
        return;
      }
      resolve(store as $rdf.Formula);
    });
  });
}

function serializeStoreToNTriples(store: $rdf.Formula): string {
  const triples = new Set<string>();
  for (const statement of store.statements) {
    triples.add(statement.toNT());
  }
  return Array.from(triples).join('\n');
}

async function loadOntologyCards(forceRefresh = false) {
  const selectedEntry = selectedCacheEntry.value;
  if (!selectedEntry) {
    ontologyRows.value = [];
    customQueryRows.value = [];
    return;
  }

  isQuerying.value = true;
  try {
    const needsPersistence = !selectedEntry.mergedGraphNTriples;
    const cacheEntry = await ensureCacheEntryGraph(selectedEntry);
    loadedCacheEntry.value = cacheEntry;
    if (needsPersistence) {
      await putOntologyToIndexedDb(cacheEntry);
    }

    if (!forceRefresh && Array.isArray(cacheEntry.ontologyQueryResults)) {
      ontologyRows.value = cacheEntry.ontologyQueryResults;
      datatypeFirst.value = 0;
      objectFirst.value = 0;
      classFirst.value = 0;
      return;
    }

    const globalGraph = await getGlobalGraphFromIndexedDb();
    if (!globalGraph?.nTriples) {
      ontologyRows.value = [];
      return;
    }

    const query = buildOntologyQuery();
    const rows = await runSparqlOnCachedOntology(query, globalGraph.nTriples);
    ontologyRows.value = rows;
    datatypeFirst.value = 0;
    objectFirst.value = 0;
    classFirst.value = 0;

    const updatedCacheEntry: CachedOntology = {
      ...cacheEntry,
      ontologyQueryResults: rows,
      queryResultsFetchedAt: new Date().toISOString(),
    };
    loadedCacheEntry.value = updatedCacheEntry;
    try {
      await putOntologyToIndexedDb(updatedCacheEntry, false);
    } catch (persistError: any) {
      setStatus(
        persistError?.message ?? 'Query results were loaded but could not be cached.',
        'warn'
      );
    }
  } catch (error: any) {
    ontologyRows.value = [];
    setStatus(error?.message ?? 'Failed to query ontology terms.', 'error');
  } finally {
    isQuerying.value = false;
  }
}

function buildOntologyQuery() {
  const namespace = selectedPrefix.value ? prefixNamespaces.value[selectedPrefix.value] ?? '' : '';

  const namespaceFilter = namespace
    ? `FILTER(STRSTARTS(STR(?about), "${escapeForSparqlString(namespace)}"))`
    : '';

  return `
    SELECT ?about ?propertyType (SAMPLE(?commentTerm) AS ?comment) WHERE {
      ?about a ?propertyType .
      FILTER(
        ?propertyType IN (
          <http://www.w3.org/2002/07/owl#ObjectProperty>,
          <http://www.w3.org/2002/07/owl#DatatypeProperty>,
          <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property>,
          <http://www.w3.org/2000/01/rdf-schema#Class>,
          <http://www.w3.org/2002/07/owl#Class>
        )
      )
      ${namespaceFilter}
      OPTIONAL {
        ?about <http://www.w3.org/2000/01/rdf-schema#comment> ?commentTerm .
        FILTER(LANG(?commentTerm) = "" || LANGMATCHES(LANG(?commentTerm), "en"))
      }
    }
    GROUP BY ?about ?propertyType
    ORDER BY STR(?about)
  `;
}

async function runSparqlOnCachedOntology(query: string, graphNTriples: string) {
  const queryEngineCtor = (window as any)?.Comunica?.QueryEngine;
  if (!queryEngineCtor) {
    throw new Error('SPARQL engine is not available.');
  }

  const engine = new queryEngineCtor();
  const sources = [{type: 'serialized', value: graphNTriples, mediaType: 'application/n-triples'}];
  const stream = await engine.queryBindings(query, {sources});

  const rows: Array<{
    about: string;
    comment: string;
    propertyType: 'ObjectProperty' | 'DatatypeProperty' | 'Class';
  }> = [];
  const seen = new Set<string>();

  const pushRow = (
    about: string,
    comment: string,
    propertyType: 'ObjectProperty' | 'DatatypeProperty' | 'Class'
  ) => {
    const key = `${about}::${propertyType}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({about, comment, propertyType});
  };

  await new Promise<void>((resolve, reject) => {
    stream
      .on('data', (binding: any) => {
        const about = getBindingValue(binding, 'about');
        if (!about) return;
        const propertyTypeIri = getBindingValue(binding, 'propertyType');
        const comment = getBindingValue(binding, 'comment');

        if (propertyTypeIri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property') {
          pushRow(about, comment, 'DatatypeProperty');
          pushRow(about, comment, 'ObjectProperty');
          return;
        }

        if (propertyTypeIri === 'http://www.w3.org/2002/07/owl#DatatypeProperty') {
          pushRow(about, comment, 'DatatypeProperty');
          return;
        }

        if (
          propertyTypeIri === 'http://www.w3.org/2000/01/rdf-schema#Class' ||
          propertyTypeIri === 'http://www.w3.org/2002/07/owl#Class'
        ) {
          pushRow(about, comment, 'Class');
          return;
        }

        pushRow(about, comment, 'ObjectProperty');
      })
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err));
  });

  return rows;
}

async function runCustomSparqlQuery() {
  const entry = selectedCacheEntry.value;
  if (!entry) {
    setStatus('Please select a prefix with a cached ontology first.', 'warn');
    return;
  }

  const query = customSparqlQuery.value;
  if (!query.trim()) {
    setStatus('Please enter a SPARQL query.', 'warn');
    return;
  }
  if (!validateCustomSparqlSyntax(query, false)) {
    return;
  }
  customQueryErrorMessage.value = null;

  const queryEngineCtor = (window as any)?.Comunica?.QueryEngine;
  if (!queryEngineCtor) {
    setStatus('SPARQL engine is not available.', 'error');
    return;
  }

  isRunningCustomQuery.value = true;
  try {
    const cacheEntry = await ensureCacheEntryGraph(entry);
    const graphNTriples = cacheEntry.mergedGraphNTriples ?? '';
    const engine = new queryEngineCtor();
    const sources = [
      {type: 'serialized', value: graphNTriples, mediaType: 'application/n-triples'},
    ];
    const stream = await engine.queryBindings(query, {sources});
    const rows: CustomQueryRow[] = [];

    await new Promise<void>((resolve, reject) => {
      stream
        .on('data', (binding: any) => {
          const row: CustomQueryRow = {};
          for (const key of binding.keys()) {
            const keyName = key?.value ?? key?.name ?? String(key).replace(/^\?/, '');
            row[keyName] = binding.get(key)?.value ?? '';
          }
          rows.push(row);
        })
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err));
    });

    customQueryRows.value = rows;
    customQueryFirst.value = 0;
    selectedCustomQueryIri.value = '';
    customQueryErrorMessage.value = null;
    customQueryAccordion.value = null;
    setStatus(`Custom query returned ${rows.length} row(s).`, 'success');
  } catch (error: any) {
    customQueryErrorMessage.value = error?.message ?? 'Failed to execute custom query.';
    setStatus(error?.message ?? 'Failed to execute custom query.', 'error');
  } finally {
    isRunningCustomQuery.value = false;
  }
}

function validateCustomSparqlSyntax(query: string, silent: boolean): boolean {
  try {
    const parser = new Parser();
    parser.parse(query);
    customQueryErrorLineNumber.value = null;
    customQueryErrorMessage.value = null;
    return true;
  } catch (err: any) {
    const lineMatch = err?.message?.match(/line[:\s]+(\d+)/i);
    if (lineMatch) {
      customQueryErrorLineNumber.value = parseInt(lineMatch[1], 10);
    } else if (err?.location?.start?.line) {
      customQueryErrorLineNumber.value = err.location.start.line;
    } else {
      customQueryErrorLineNumber.value = null;
    }
    customQueryErrorMessage.value = err?.message ?? 'Invalid SPARQL query syntax.';
    if (!silent) {
      setStatus(err?.message ?? 'Invalid SPARQL query syntax.', 'error');
    }
    return false;
  }
}

function validateCustomQueryLive() {
  if (customQueryValidateTimer) {
    window.clearTimeout(customQueryValidateTimer);
  }
  customQueryValidateTimer = window.setTimeout(() => {
    const query = customSparqlQuery.value;
    if (!query.trim()) {
      customQueryErrorLineNumber.value = null;
      customQueryErrorMessage.value = null;
      return;
    }
    validateCustomSparqlSyntax(query, true);
  }, 250);
}

watch(customSparqlQuery, () => {
  validateCustomQueryLive();
});

async function ensureCacheEntryGraph(entry: CachedOntology): Promise<CachedOntology> {
  if (entry.mergedGraphNTriples) {
    return entry;
  }

  const rootUrl = entry.url || `cached://${entry.ontologyPrefix}`;
  const store = await parseRdfToStore(entry.content, rootUrl, entry.format);
  const upgradedEntry: CachedOntology = {
    ...entry,
    mergedGraphNTriples: serializeStoreToNTriples(store),
  };

  loadedCacheEntry.value = upgradedEntry;
  await putOntologyToIndexedDb(upgradedEntry);
  return upgradedEntry;
}

function filterRows(
  rows: Array<{
    about: string;
    comment: string;
    propertyType: 'ObjectProperty' | 'DatatypeProperty' | 'Class';
  }>,
  query: string
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter(
    row =>
      row.about.toLowerCase().includes(normalized) || row.comment.toLowerCase().includes(normalized)
  );
}

function filterCustomQueryRows(rows: CustomQueryRow[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter(row =>
    Object.values(row).some(value => value.toLowerCase().includes(normalized))
  );
}

function getBindingValue(binding: any, name: string): string {
  for (const key of binding.keys()) {
    const keyName = key?.value ?? key?.name ?? String(key).replace(/^\?/, '');
    if (keyName === name) {
      return binding.get(key)?.value ?? '';
    }
  }
  return '';
}

function termNameFromIri(iri: string): string {
  if (!iri) return '';
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  const splitIndex = Math.max(hashIndex, slashIndex);
  if (splitIndex === -1 || splitIndex === iri.length - 1) {
    return iri;
  }
  return decodeURIComponent(iri.slice(splitIndex + 1));
}

function buildOntologyTermHref(about: string): string {
  if (!about) return '';

  const namespace = selectedPrefix.value ? prefixNamespaces.value[selectedPrefix.value] ?? '' : '';
  if (!namespace) return about;
  if (about.startsWith(namespace)) return about;
  return `${namespace}${termNameFromIri(about)}`;
}

function escapeForSparqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function openOntologyDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }

  if (ontologyDbPromise) return ontologyDbPromise;

  ontologyDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;

      let ontologyStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        ontologyStore = db.createObjectStore(INDEXED_DB_STORE, {keyPath: 'ontologyPrefix'});
      } else {
        ontologyStore = tx!.objectStore(INDEXED_DB_STORE);
      }

      if (!db.objectStoreNames.contains(INDEXED_DB_GRAPH_STORE)) {
        db.createObjectStore(INDEXED_DB_GRAPH_STORE, {keyPath: 'id'});
      }

      if (db.objectStoreNames.contains(LEGACY_INDEXED_DB_STORE) && tx) {
        const legacyStore = tx.objectStore(LEGACY_INDEXED_DB_STORE);
        legacyStore.openCursor().onsuccess = event => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          const normalized = normalizeCachedOntology(cursor.value as CachedOntology | undefined);
          if (normalized) {
            ontologyStore.put(normalized);
          }
          cursor.continue();
        };
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };

    request.onerror = () => {
      reject(new Error(request.error?.message || 'Failed to open IndexedDB.'));
    };
  });

  ontologyDbPromise = ontologyDbPromise.catch(error => {
    ontologyDbPromise = null;
    throw error;
  });

  return ontologyDbPromise;
}

async function getOntologyFromIndexedDb(ontologyPrefix: string): Promise<CachedOntology | null> {
  const db = await openOntologyDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
    const store = tx.objectStore(INDEXED_DB_STORE);
    const request = store.get(ontologyPrefix);

    request.onsuccess = () => {
      const result = request.result as CachedOntology | undefined;
      resolve(normalizeCachedOntology(result));
    };

    request.onerror = () => {
      reject(new Error(request.error?.message || 'Failed to read ontology from IndexedDB.'));
    };
  });
}

function normalizeCachedOntology(value: CachedOntology | undefined): CachedOntology | null {
  if (!value) return null;
  const ontologyPrefix = value.ontologyPrefix || (value as any).prefix;
  if (!ontologyPrefix) return null;
  return {
    ...value,
    ontologyPrefix,
    mergedGraphNTriples:
      typeof value.mergedGraphNTriples === 'string' ? value.mergedGraphNTriples : '',
    ontologyQueryResults: Array.isArray(value.ontologyQueryResults)
      ? value.ontologyQueryResults
      : undefined,
    queryResultsFetchedAt:
      typeof value.queryResultsFetchedAt === 'string' ? value.queryResultsFetchedAt : undefined,
  };
}

async function getAllOntologiesFromIndexedDb(): Promise<CachedOntology[]> {
  const db = await openOntologyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
    const store = tx.objectStore(INDEXED_DB_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const rawEntries = Array.isArray(request.result) ? request.result : [];
      const entries = rawEntries
        .map(value => normalizeCachedOntology(value as CachedOntology | undefined))
        .filter((value): value is CachedOntology => value !== null);
      resolve(entries);
    };

    request.onerror = () => {
      reject(new Error(request.error?.message || 'Failed to read ontologies from IndexedDB.'));
    };
  });
}

async function getGlobalGraphFromIndexedDb(): Promise<CachedGlobalGraph | null> {
  const db = await openOntologyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_GRAPH_STORE, 'readonly');
    const store = tx.objectStore(INDEXED_DB_GRAPH_STORE);
    const request = store.get('global');

    request.onsuccess = () => {
      const value = request.result as CachedGlobalGraph | undefined;
      resolve(value ?? null);
    };

    request.onerror = () => {
      reject(new Error(request.error?.message || 'Failed to read RDF graph from IndexedDB.'));
    };
  });
}

async function putGlobalGraphToIndexedDb(graph: CachedGlobalGraph): Promise<void> {
  const db = await openOntologyDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_GRAPH_STORE, 'readwrite');
    const store = tx.objectStore(INDEXED_DB_GRAPH_STORE);
    store.put(graph);

    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(new Error(tx.error?.message || 'Failed to write RDF graph to IndexedDB.'));
    tx.onabort = () => reject(new Error(tx.error?.message || 'IndexedDB graph write aborted.'));
  });
}

async function rebuildAndStoreGlobalGraph(): Promise<CachedGlobalGraph> {
  const entries = await getAllOntologiesFromIndexedDb();
  const triples = new Set<string>();
  for (const entry of entries) {
    const lines = (await getEntryGraphNTriples(entry))
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      triples.add(line);
    }
  }

  const graphEntry: CachedGlobalGraph = {
    id: 'global',
    nTriples: Array.from(triples).join('\n'),
    updatedAt: new Date().toISOString(),
  };
  await putGlobalGraphToIndexedDb(graphEntry);
  return graphEntry;
}

async function getEntryGraphNTriples(entry: CachedOntology): Promise<string> {
  if (entry.mergedGraphNTriples) return entry.mergedGraphNTriples;

  const rootUrl = entry.url || `cached://${entry.ontologyPrefix}`;
  const rootStore = await parseRdfToStore(entry.content, rootUrl, entry.format);
  return serializeStoreToNTriples(rootStore);
}

async function putOntologyToIndexedDb(
  entry: CachedOntology,
  rebuildGlobalGraph = true
): Promise<void> {
  if (!entry.ontologyPrefix) {
    throw new Error('Failed to cache ontology: missing ontology prefix key.');
  }

  const db = await openOntologyDb();
  const storableEntry = toStorableCachedOntology(entry);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
    const store = tx.objectStore(INDEXED_DB_STORE);
    store.put(storableEntry);

    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(new Error(tx.error?.message || 'Failed to write ontology to IndexedDB.'));
    tx.onabort = () => reject(new Error(tx.error?.message || 'IndexedDB write aborted.'));
  });

  if (rebuildGlobalGraph) {
    await rebuildAndStoreGlobalGraph();
  }
}

function toStorableCachedOntology(entry: CachedOntology): CachedOntology {
  const rawEntry = toRaw(entry) as CachedOntology;
  return {
    ontologyPrefix: String(rawEntry.ontologyPrefix ?? ''),
    url: String(rawEntry.url ?? ''),
    content: String(rawEntry.content ?? ''),
    format: String(rawEntry.format ?? ''),
    contentType: String(rawEntry.contentType ?? ''),
    fetchedAt: String(rawEntry.fetchedAt ?? ''),
    mergedGraphNTriples: rawEntry.mergedGraphNTriples ? String(rawEntry.mergedGraphNTriples) : '',
    ontologyQueryResults: (rawEntry.ontologyQueryResults ?? []).map(row => ({
      about: String(row?.about ?? ''),
      comment: String(row?.comment ?? ''),
      propertyType:
        row?.propertyType === 'DatatypeProperty' ||
        row?.propertyType === 'ObjectProperty' ||
        row?.propertyType === 'Class'
          ? row.propertyType
          : 'ObjectProperty',
    })),
    queryResultsFetchedAt: rawEntry.queryResultsFetchedAt
      ? String(rawEntry.queryResultsFetchedAt)
      : undefined,
  };
}

async function deleteOntologyFromIndexedDb(ontologyPrefix: string): Promise<void> {
  const db = await openOntologyDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
    const store = tx.objectStore(INDEXED_DB_STORE);
    store.delete(ontologyPrefix);

    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(new Error(tx.error?.message || 'Failed to delete ontology from IndexedDB.'));
    tx.onabort = () => reject(new Error(tx.error?.message || 'IndexedDB delete aborted.'));
  });

  await rebuildAndStoreGlobalGraph();
}

async function deleteCachedOntology() {
  if (!selectedPrefix.value) return;

  const prefixToDelete = selectedPrefix.value;
  try {
    await deleteOntologyFromIndexedDb(prefixToDelete);
    if (selectedPrefix.value === prefixToDelete) {
      loadedCacheEntry.value = null;
      ontologyRows.value = [];
      customQueryRows.value = [];
      selectedDatatypeRow.value = null;
      selectedObjectRow.value = null;
      selectedClassRow.value = null;
      ontologyUrl.value = '';
    }
    deleteDialog.value = false;
    setStatus(`Cached ontology for prefix "${prefixToDelete}" was deleted from IndexedDB.`, 'info');
  } catch (error: any) {
    setStatus(error?.message ?? 'Failed to delete cached ontology.', 'error');
  }
}

function confirmDeleteCachedOntology() {
  deleteDialog.value = true;
}

function selectCurrentIri() {
  if (!selectedRowIri.value) return;
  emit('select-iri', selectedRowIri.value);
}

function onCustomQueryValueClick(rawValue: unknown) {
  const iri = normalizePotentialIri(rawValue);
  selectedCustomQueryIri.value = iri && isLikelyIri(iri) ? iri : '';
}

function normalizePotentialIri(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isLikelyIri(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('_:')) return false;
  if (/\s/.test(value)) return false;
  return /^[A-Za-z][A-Za-z0-9+.-]*:.+/.test(value);
}

function tryAutoSelectFromInitialIri() {
  if (!pendingInitialIri.value || !prefixes.value.length) return;
  const bestPrefix = findBestPrefixForIri(pendingInitialIri.value);
  if (!bestPrefix) return;
  if (!selectedPrefix.value) {
    isAutoSelectingPrefix.value = true;
    selectedPrefix.value = bestPrefix;
    return;
  }
  if (selectedPrefix.value !== bestPrefix) {
    return;
  }
  trySelectRowForIri(pendingInitialIri.value);
}

function trySelectRowForIri(iri: string) {
  if (!iri || !selectedPrefix.value || !ontologyRows.value.length) return;

  const namespace = selectedPrefix.value ? prefixNamespaces.value[selectedPrefix.value] ?? '' : '';

  const match = ontologyRows.value.find(row => rowMatchesIri(row.about, iri, namespace));
  if (!match) return;
  if (!isRowTypeEnabled(match.propertyType)) return;

  if (match.propertyType === 'DatatypeProperty') {
    activePropertyTab.value = 'DatatypeProperty';
    selectedDatatypeRow.value = match;
    selectedObjectRow.value = null;
    selectedClassRow.value = null;
  } else if (match.propertyType === 'Class') {
    activePropertyTab.value = 'Class';
    selectedClassRow.value = match;
    selectedDatatypeRow.value = null;
    selectedObjectRow.value = null;
  } else {
    activePropertyTab.value = 'ObjectProperty';
    selectedObjectRow.value = match;
    selectedDatatypeRow.value = null;
    selectedClassRow.value = null;
  }
  focusMatchedRow(match);
  pendingInitialIri.value = '';
}

function findBestPrefixForIri(iri: string): string | null {
  let bestPrefix: string | null = null;
  let bestLength = -1;

  for (const [prefix, namespace] of Object.entries(prefixNamespaces.value)) {
    if (!namespace) continue;
    if (iri.startsWith(namespace) && namespace.length > bestLength) {
      bestPrefix = prefix;
      bestLength = namespace.length;
    }
  }
  return bestPrefix;
}

function rowMatchesIri(rowAbout: string, iri: string, namespace: string): boolean {
  if (rowAbout === iri) return true;
  if (!namespace) return false;
  return `${namespace}${termNameFromIri(rowAbout)}` === iri;
}

function isRowTypeEnabled(propertyType: 'ObjectProperty' | 'DatatypeProperty' | 'Class'): boolean {
  if (propertyType === 'DatatypeProperty') return isDatatypeTabEnabled.value;
  if (propertyType === 'ObjectProperty') return isObjectPropertyTabEnabled.value;
  return isClassTabEnabled.value;
}

function normalizeIri(value: string | undefined): string {
  return (value ?? '').trim();
}

async function focusMatchedRow(match: {
  about: string;
  propertyType: 'ObjectProperty' | 'DatatypeProperty' | 'Class';
}) {
  await nextTick();
  window.setTimeout(async () => {
    await nextTick();
    const rows =
      match.propertyType === 'DatatypeProperty'
        ? filteredDatatypeRows.value
        : match.propertyType === 'ObjectProperty'
        ? filteredObjectRows.value
        : filteredClassRows.value;
    const index = rows.findIndex(row => row.about === match.about);
    if (index < 0) return;
    const pageFirst = Math.floor(index / ROWS_PER_PAGE) * ROWS_PER_PAGE;
    if (match.propertyType === 'DatatypeProperty' && datatypeFirst.value !== pageFirst) {
      datatypeFirst.value = pageFirst;
      await nextTick();
    } else if (match.propertyType === 'ObjectProperty' && objectFirst.value !== pageFirst) {
      objectFirst.value = pageFirst;
      await nextTick();
    } else if (match.propertyType === 'Class' && classFirst.value !== pageFirst) {
      classFirst.value = pageFirst;
      await nextTick();
    }

    const tableRef =
      match.propertyType === 'DatatypeProperty'
        ? datatypeTableRef.value
        : match.propertyType === 'ObjectProperty'
        ? objectTableRef.value
        : classTableRef.value;
    const tableEl = tableRef?.$el as HTMLElement | undefined;
    const localIndex = index % ROWS_PER_PAGE;
    const rowEl = tableEl?.querySelector(`tr[data-p-index="${localIndex}"]`) as HTMLElement | null;
    if (!rowEl) return;

    rowEl.scrollIntoView({behavior: 'smooth', block: 'center'});
    rowEl.focus();
  }, 140);
}

function setStatus(message: string, severity: 'success' | 'info' | 'warn' | 'error' = 'info') {
  statusMessage.value = message;
  statusSeverity.value = severity;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function extractPrefixNamespaces(context: any): Record<string, string> {
  const out: Record<string, string> = {};

  if (Array.isArray(context)) {
    for (const part of context) {
      collectFromContextObject(part, out);
    }
  } else {
    collectFromContextObject(context, out);
  }

  return out;
}

function collectFromContextObject(contextPart: any, out: Record<string, string>) {
  if (!contextPart || typeof contextPart !== 'object' || Array.isArray(contextPart)) {
    return;
  }

  for (const [key, value] of Object.entries(contextPart)) {
    if (typeof value === 'string') {
      out[key] = value;
      continue;
    }

    if (value && typeof value === 'object' && '@id' in value && typeof value['@id'] === 'string') {
      out[key] = value['@id'];
    }
  }
}
</script>

<style scoped>
.rdf-ontology-explorer {
  height: 100%;
}

.explorer-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.prefix-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.content-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.content-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--p-content-border-color, #d1d5db);
  border-radius: 0.5rem;
  min-height: 0;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.selection-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

.selection-input {
  flex: 1;
}

.custom-query-cell {
  all: unset;
  display: block;
  width: 100%;
  cursor: default;
  color: inherit;
}

.custom-query-cell.iri {
  cursor: pointer;
  color: var(--p-primary-color, #2563eb);
  text-decoration: underline;
}

.ontology-term-link {
  color: var(--p-primary-color, #2563eb);
  text-decoration: underline;
}

.wrapped-comment {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.custom-query-editor {
  height: 16rem;
  min-height: 12rem;
}

.prefix-listbox {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.prefix-listbox :deep(.p-listbox) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.prefix-listbox :deep(.p-listbox-list-container) {
  max-height: none !important;
  height: 100%;
  overflow: auto;
  min-height: 0;
}

.table-wrapper :deep(.p-tabs) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.table-wrapper :deep(.p-tablist) {
  flex-shrink: 0;
}

.table-wrapper :deep(.p-tabpanels) {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.table-wrapper :deep(.p-tabpanel) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.table-wrapper :deep(.p-datatable) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-wrapper :deep(.p-datatable-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
