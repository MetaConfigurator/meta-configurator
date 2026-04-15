<template>
  <div ref="explorerRoot" class="rdf-ontology-explorer p-3">
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
          listStyle="height: 100%" />
      </div>
      <div v-if="selectedPrefix" class="content-pane">
        <Accordion v-model:value="activeAccordion" class="mb-3">
          <AccordionPanel :value="ONTOLOGY_ACCORDION_SECTION.Controls">
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
          <RdfOntologyTermTabs
            v-model="activePropertyTab"
            :rows="ontologyRows"
            :sourceField="props.sourceField"
            :selectedPrefix="selectedPrefix"
            :prefixNamespaces="prefixNamespaces"
            :initialIri="pendingInitialIri"
            :rowsPerPage="ROWS_PER_PAGE"
            @preview-iri="onOntologyPreviewIri">
            <template #extra-tabs>
              <Tab :value="ONTOLOGY_EXPLORER_TAB.SPARQL">SPARQL</Tab>
            </template>
            <template #extra-panels>
              <TabPanel :value="ONTOLOGY_EXPLORER_TAB.SPARQL">
                <RdfOntologySparqlTab
                  :selectedCacheEntry="selectedCacheEntry"
                  :rowsPerPage="ROWS_PER_PAGE"
                  :defaultQuery="DEFAULT_SPARQL_QUERY"
                  :ensureCacheEntryGraph="ensureCacheEntryGraph"
                  :putOntologyToIndexedDb="putOntologyToIndexedDb"
                  @select-iri="onSparqlQueryIriSelect"
                  @status="onSparqlQueryStatus" />
              </TabPanel>
            </template>
          </RdfOntologyTermTabs>
          <div class="selection-bar mt-2">
            <InputText :modelValue="selectedRowIri" class="selection-input" readonly />
            <Button
              label="Select"
              icon="pi pi-check"
              :disabled="!canSelectCurrentIri"
              @click="selectCurrentIri" />
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
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
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
import Tab from 'primevue/tab';
import TabPanel from 'primevue/tabpanel';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';
import RdfOntologyTermTabs from '@/components/panels/rdf/ontology-explorer/RdfOntologyTermTabs.vue';
import RdfOntologySparqlTab from '@/components/panels/rdf/ontology-explorer/RdfOntologySparqlTab.vue';
import {
  deleteOntologyFromRdfCache,
  getOntologyFromRdfCache,
  putOntologyInRdfCache,
  type RdfCachedOntology,
  type RdfOntologyRow,
} from '@/components/panels/rdf/ontology-explorer/rdfIndexedDbManager';
import {
  OntologyAccordionSection,
  OntologyExplorerTab,
  OntologySourceField,
  RdfBindingName,
  RdfMediaType,
  RdfPropertyType,
  RdfPropertyTypeIri,
  RdfStatusSeverity,
} from '@/components/panels/rdf/rdfEnums';
import {useOntologyImport} from '@/components/panels/rdf/ontology-explorer/useOntologyImport';
import {
  detectRdfFormat,
  buildOntologyQuery,
  extractPrefixNamespaces,
  formatDate,
  getBindingValue,
  normalizeIri,
  parseRdfToStore,
  serializeStoreToNTriples,
} from '@/components/panels/rdf/ontology-explorer/rdfOntologyUtils';

const props = withDefaults(
  defineProps<{
    initialIri?: string;
    sourceField?: OntologySourceField;
  }>(),
  {
    initialIri: '',
    sourceField: OntologySourceField.Predicate,
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
const statusSeverity = ref<RdfStatusSeverity>(RdfStatusSeverity.Info);
const isQuerying = ref(false);
const ontologyRows = ref<OntologyRow[]>([]);
const ROWS_PER_PAGE = 100;
const activePropertyTab = ref<OntologyExplorerTab>(OntologyExplorerTab.ObjectProperty);
const selectedOntologyTabIri = ref('');
const DEFAULT_SPARQL_QUERY = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100';
const selectedSparqlQueryIri = ref('');
const pendingInitialIri = ref('');
const isAutoSelectingPrefix = ref(false);
const activeAccordion = ref<OntologyAccordionSection | null>(OntologyAccordionSection.Controls);
const deleteDialog = ref(false);
const ontologyFileUploadRef = ref<any | null>(null);
const explorerRoot = ref<HTMLElement | null>(null);

let stopClickListener: ((event: Event) => void) | null = null;
let stopKeydownListener: ((event: Event) => void) | null = null;

type CachedOntology = RdfCachedOntology;
type OntologyRow = RdfOntologyRow;

const ONTOLOGY_EXPLORER_TAB = OntologyExplorerTab;
const ONTOLOGY_ACCORDION_SECTION = OntologyAccordionSection;

const loadedCacheEntry = ref<CachedOntology | null>(null);
let prefixLookupRequestId = 0;

onMounted(() => {
  const root = explorerRoot.value;
  if (!root) return;

  stopClickListener = (event: Event) => {
    event.stopPropagation();
  };
  stopKeydownListener = (event: Event) => {
    event.stopPropagation();
  };

  root.addEventListener('click', stopClickListener);
  root.addEventListener('keydown', stopKeydownListener);
});

onUnmounted(() => {
  const root = explorerRoot.value;
  if (!root) return;

  if (stopClickListener) {
    root.removeEventListener('click', stopClickListener);
    stopClickListener = null;
  }
  if (stopKeydownListener) {
    root.removeEventListener('keydown', stopKeydownListener);
    stopKeydownListener = null;
  }
});

const prefixOptions = computed(() =>
  prefixes.value.map(prefix => ({label: prefix, value: prefix}))
);
const selectedCacheEntry = computed(() => {
  if (!selectedPrefix.value) return null;
  const entry = loadedCacheEntry.value;
  const selectedOntologyIri = getOntologyIriForPrefix(selectedPrefix.value);
  if (!entry || !selectedOntologyIri || entry.ontologyIri !== selectedOntologyIri) return null;
  return entry;
});

const selectedRowIri = computed(() => {
  return activePropertyTab.value === OntologyExplorerTab.SPARQL
    ? selectedSparqlQueryIri.value
    : selectedOntologyTabIri.value;
});
const canSelectCurrentIri = computed(() => jsonLdContextManager.isIRI(selectedRowIri.value));

watch(
  () => data.data.value,
  _ => {
    const resolvedContext = jsonLdContextManager.getContextText();
    prefixNamespaces.value = extractPrefixNamespaces(JSON.parse(resolvedContext));
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
  selectedPrefix,
  async newPrefix => {
    const requestId = ++prefixLookupRequestId;
    if (isAutoSelectingPrefix.value) {
      isAutoSelectingPrefix.value = false;
    }
    statusMessage.value = '';
    ontologyRows.value = [];
    selectedSparqlQueryIri.value = '';
    selectedOntologyTabIri.value = '';
    loadedCacheEntry.value = null;
    if (!newPrefix) {
      ontologyUrl.value = '';
      return;
    }
    try {
      ontologyUrl.value = '';
      const ontologyIri = getOntologyIriForPrefix(newPrefix);
      if (!ontologyIri) {
        setStatus(
          `No ontology IRI found in @context for prefix "${newPrefix}".`,
          RdfStatusSeverity.Warn
        );
        return;
      }
      const cachedEntry = await getOntologyFromIndexedDb(ontologyIri);
      if (requestId !== prefixLookupRequestId) return;
      loadedCacheEntry.value = cachedEntry;
      ontologyUrl.value = cachedEntry?.url ?? '';
      if (cachedEntry) {
        await loadOntologyCards();
      }
    } catch (error: any) {
      if (requestId !== prefixLookupRequestId) return;
      setStatus(
        error?.message ?? 'Failed to read cached ontology from IndexedDB.',
        RdfStatusSeverity.Warn
      );
    }
  },
  {immediate: true}
);

watch(
  () => props.sourceField,
  sourceField => {
    activePropertyTab.value =
      sourceField === OntologySourceField.Object
        ? OntologyExplorerTab.Class
        : OntologyExplorerTab.ObjectProperty;
    selectedOntologyTabIri.value = '';
  },
  {immediate: true}
);

watch(
  selectedCacheEntry,
  entry => {
    activeAccordion.value = entry ? null : OntologyAccordionSection.Controls;
  },
  {immediate: true}
);

const {RDF_FILE_ACCEPT, downloadAndCacheOntology, onOntologyFileSelected} = useOntologyImport({
  selectedPrefix,
  ontologyUrl,
  loadedCacheEntry,
  isDownloading,
  isUploading,
  ontologyFileUploadRef,
  getOntologyIriForPrefix,
  setStatus,
  putOntologyToIndexedDb,
  loadOntologyCards,
});

async function loadOntologyCards(forceRefresh = false) {
  const selectedEntry = selectedCacheEntry.value;
  if (!selectedEntry) {
    ontologyRows.value = [];
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
      return;
    }

    const graphNTriples = cacheEntry.mergedGraphNTriples ?? '';
    if (!graphNTriples.trim()) {
      ontologyRows.value = [];
      return;
    }

    const namespace = selectedPrefix.value
      ? prefixNamespaces.value[selectedPrefix.value] ?? ''
      : '';
    const query = buildOntologyQuery(namespace);
    const rows = await runSparqlOnCachedOntology(query, graphNTriples);
    ontologyRows.value = rows;

    const updatedCacheEntry: CachedOntology = {
      ...cacheEntry,
      ontologyQueryResults: rows,
      queryResultsFetchedAt: new Date().toISOString(),
    };
    loadedCacheEntry.value = updatedCacheEntry;
    try {
      await putOntologyToIndexedDb(updatedCacheEntry);
    } catch (persistError: any) {
      setStatus(
        persistError?.message ?? 'Query results were loaded but could not be cached.',
        RdfStatusSeverity.Warn
      );
    }
  } catch (error: any) {
    ontologyRows.value = [];
    setStatus(error?.message ?? 'Failed to query ontology terms.', RdfStatusSeverity.Error);
  } finally {
    isQuerying.value = false;
  }
}

async function runSparqlOnCachedOntology(query: string, graphNTriples: string) {
  const queryEngineCtor = (window as any)?.Comunica?.QueryEngine;
  if (!queryEngineCtor) {
    throw new Error('SPARQL engine is not available.');
  }

  const engine = new queryEngineCtor();
  const sources = [{type: 'serialized', value: graphNTriples, mediaType: RdfMediaType.NTriples}];
  const stream = await engine.queryBindings(query, {sources});

  const rows: Array<{
    about: string;
    comment: string;
    propertyType: RdfPropertyType;
  }> = [];
  const seen = new Set<string>();

  const pushRow = (about: string, comment: string, propertyType: RdfPropertyType) => {
    const key = `${about}::${propertyType}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({about, comment, propertyType});
  };

  await new Promise<void>((resolve, reject) => {
    stream
      .on('data', (binding: any) => {
        const about = getBindingValue(binding, RdfBindingName.About);
        if (!about) return;
        const propertyTypeIri = getBindingValue(binding, RdfBindingName.PropertyType);
        const comment = getBindingValue(binding, RdfBindingName.Comment);

        if (propertyTypeIri === RdfPropertyTypeIri.RdfProperty) {
          pushRow(about, comment, RdfPropertyType.DatatypeProperty);
          pushRow(about, comment, RdfPropertyType.ObjectProperty);
          return;
        }

        if (propertyTypeIri === RdfPropertyTypeIri.OwlDatatypeProperty) {
          pushRow(about, comment, RdfPropertyType.DatatypeProperty);
          return;
        }

        if (
          propertyTypeIri === RdfPropertyTypeIri.RdfsClass ||
          propertyTypeIri === RdfPropertyTypeIri.OwlClass
        ) {
          pushRow(about, comment, RdfPropertyType.Class);
          return;
        }

        pushRow(about, comment, RdfPropertyType.ObjectProperty);
      })
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err));
  });

  return rows;
}

async function ensureCacheEntryGraph(entry: CachedOntology): Promise<CachedOntology> {
  if (entry.mergedGraphNTriples) {
    return entry;
  }

  const rootUrl = entry.url || `cached://${entry.ontologyIri}`;
  const format = entry.format ?? detectRdfFormat(entry.contentType ?? '', rootUrl);
  if (!format) {
    throw new Error('Failed to regenerate cached ontology graph: missing RDF format.');
  }
  const store = await parseRdfToStore(entry.rawContent, rootUrl, format);
  const upgradedEntry: CachedOntology = {
    ...entry,
    mergedGraphNTriples: serializeStoreToNTriples(store),
  };

  loadedCacheEntry.value = upgradedEntry;
  await putOntologyToIndexedDb(upgradedEntry);
  return upgradedEntry;
}

async function getOntologyFromIndexedDb(ontologyIri: string): Promise<CachedOntology | null> {
  return await getOntologyFromRdfCache(ontologyIri);
}

async function putOntologyToIndexedDb(entry: CachedOntology): Promise<void> {
  await putOntologyInRdfCache(entry);
}

async function deleteOntologyFromIndexedDb(ontologyIri: string): Promise<void> {
  await deleteOntologyFromRdfCache(ontologyIri);
}

async function deleteCachedOntology() {
  if (!selectedPrefix.value) return;

  const prefixToDelete = selectedPrefix.value;
  const ontologyIri = getOntologyIriForPrefix(prefixToDelete);
  if (!ontologyIri) {
    setStatus(
      `No ontology IRI found in @context for prefix "${prefixToDelete}".`,
      RdfStatusSeverity.Warn
    );
    return;
  }
  try {
    await deleteOntologyFromIndexedDb(ontologyIri);
    if (selectedPrefix.value === prefixToDelete) {
      loadedCacheEntry.value = null;
      ontologyRows.value = [];
      selectedOntologyTabIri.value = '';
      selectedSparqlQueryIri.value = '';
      ontologyUrl.value = '';
    }
    deleteDialog.value = false;
    setStatus(
      `Cached ontology for prefix "${prefixToDelete}" was deleted from IndexedDB.`,
      RdfStatusSeverity.Info
    );
  } catch (error: any) {
    setStatus(error?.message ?? 'Failed to delete cached ontology.', RdfStatusSeverity.Error);
  }
}

function confirmDeleteCachedOntology() {
  deleteDialog.value = true;
}

function selectCurrentIri() {
  if (!canSelectCurrentIri.value) return;
  emit('select-iri', selectedRowIri.value);
}

function onSparqlQueryIriSelect(iri: string) {
  selectedSparqlQueryIri.value = iri;
}

function onSparqlQueryStatus(payload: {message: string; severity: RdfStatusSeverity}) {
  setStatus(payload.message, payload.severity);
}

function onOntologyPreviewIri(iri: string) {
  selectedOntologyTabIri.value = iri;
  if (iri) {
    pendingInitialIri.value = '';
  }
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

function getOntologyIriForPrefix(prefix: string): string {
  return String(prefixNamespaces.value[prefix] ?? '').trim();
}

function setStatus(message: string, severity: RdfStatusSeverity = RdfStatusSeverity.Info) {
  statusMessage.value = message;
  statusSeverity.value = severity;
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
  border: 1px dashed var(--p-content-border-color);
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
