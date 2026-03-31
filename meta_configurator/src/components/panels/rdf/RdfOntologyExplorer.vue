<template>
  <div class="rdf-ontology-explorer p-3">
    <div class="explorer-layout">
      <div class="prefix-pane">
        <label class="text-sm font-medium block mb-2">Prefixes</label>
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
        <div class="flex flex-col gap-2 mb-3">
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
              :loading="isDownloading"
              :disabled="!selectedPrefix || !ontologyUrl"
              @click="downloadAndCacheOntology" />
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              severity="secondary"
              variant="text"
              :loading="isQuerying"
              :disabled="!selectedCacheEntry"
              @click="loadOntologyCards" />
            <Button
              label="Delete"
              icon="pi pi-trash"
              severity="danger"
              variant="text"
              :disabled="!selectedPrefix || !selectedCacheEntry"
              @click="deleteCachedOntology" />
          </div>
          <small v-if="selectedCacheEntry" class="text-muted-color">
            Cached on {{ formatDate(selectedCacheEntry.fetchedAt) }}
          </small>
        </div>

        <Message v-if="statusMessage" :severity="statusSeverity" :closable="false" class="mb-3">
          {{ statusMessage }}
        </Message>

        <div v-if="isQuerying" class="text-sm text-muted-color">Loading terms...</div>
        <div v-else-if="ontologyRows.length === 0" class="text-sm text-muted-color">
          No ontology terms loaded yet.
        </div>
        <div v-else class="table-wrapper">
          <Tabs v-model:value="activePropertyTab" class="ontology-tabs">
            <TabList>
              <Tab value="DatatypeProperty">DatatypeProperty</Tab>
              <Tab value="ObjectProperty">ObjectProperty</Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="DatatypeProperty">
                <div class="table-search mb-2">
                  <InputText
                    v-model.trim="datatypeSearch"
                    placeholder="Search datatype properties"
                    class="w-full" />
                </div>
                <DataTable
                  :value="filteredDatatypeRows"
                  v-model:selection="selectedDatatypeRow"
                  selectionMode="single"
                  dataKey="about"
                  size="small"
                  scrollable
                  scrollHeight="flex">
                  <Column selectionMode="single" headerStyle="width: 3rem" />
                  <Column field="about" header="rdf:about">
                    <template #body="{data}">
                      {{ termNameFromIri(data.about) }}
                    </template>
                  </Column>
                  <Column field="comment" header="comment" />
                </DataTable>
              </TabPanel>
              <TabPanel value="ObjectProperty">
                <div class="table-search mb-2">
                  <InputText
                    v-model.trim="objectSearch"
                    placeholder="Search object properties"
                    class="w-full" />
                </div>
                <DataTable
                  :value="filteredObjectRows"
                  v-model:selection="selectedObjectRow"
                  selectionMode="single"
                  dataKey="about"
                  size="small"
                  scrollable
                  scrollHeight="flex">
                  <Column selectionMode="single" headerStyle="width: 3rem" />
                  <Column field="about" header="rdf:about">
                    <template #body="{data}">
                      {{ termNameFromIri(data.about) }}
                    </template>
                  </Column>
                  <Column field="comment" header="comment" />
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
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import * as $rdf from 'rdflib';
import Listbox from 'primevue/listbox';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';

const props = withDefaults(
  defineProps<{
    sessionMode?: SessionMode;
    explorerMode?: 'Predicate' | 'Object';
  }>(),
  {
    sessionMode: SessionMode.DataEditor,
    explorerMode: 'Predicate',
  }
);
const emit = defineEmits<{
  (e: 'select-iri', iri: string): void;
}>();

const data = getDataForMode(props.sessionMode);
const selectedPrefix = ref<string | null>(null);
const prefixes = ref<string[]>([]);
const prefixNamespaces = ref<Record<string, string>>({});
const ontologyUrl = ref('');
const isDownloading = ref(false);
const statusMessage = ref('');
const statusSeverity = ref<'success' | 'info' | 'warn' | 'error'>('info');
const isQuerying = ref(false);
const ontologyRows = ref<
  Array<{about: string; comment: string; propertyType: 'ObjectProperty' | 'DatatypeProperty'}>
>([]);
const activePropertyTab = ref<'DatatypeProperty' | 'ObjectProperty'>('ObjectProperty');
const datatypeSearch = ref('');
const objectSearch = ref('');
const selectedDatatypeRow = ref<any | null>(null);
const selectedObjectRow = ref<any | null>(null);

type CachedOntology = {
  prefix: string;
  url: string;
  content: string;
  format: string;
  contentType: string;
  fetchedAt: string;
};

const STORAGE_KEY = 'rdf_ontology_cache_v1';
const ACCEPT_RDF_HEADER =
  'application/rdf+xml, text/turtle, application/x-turtle, application/n-triples, text/n3, application/ld+json, application/json, application/xml, text/xml, text/plain';
const ontologyCache = ref<Record<string, CachedOntology>>(loadCacheFromStorage());

const prefixOptions = computed(() =>
  prefixes.value.map(prefix => ({label: prefix, value: prefix}))
);
const selectedCacheEntry = computed(() => {
  if (!selectedPrefix.value) return null;
  return ontologyCache.value[selectedPrefix.value] ?? null;
});
const datatypeRows = computed(() =>
  ontologyRows.value.filter(row => row.propertyType === 'DatatypeProperty')
);
const objectRows = computed(() =>
  ontologyRows.value.filter(row => row.propertyType === 'ObjectProperty')
);
const filteredDatatypeRows = computed(() => filterRows(datatypeRows.value, datatypeSearch.value));
const filteredObjectRows = computed(() => filterRows(objectRows.value, objectSearch.value));
const activeSelectedRow = computed(() =>
  activePropertyTab.value === 'DatatypeProperty'
    ? selectedDatatypeRow.value
    : selectedObjectRow.value
);
const selectedRowIri = computed(() => {
  const row = activeSelectedRow.value;
  if (!row?.about) return '';

  const namespace =
    selectedPrefix.value && prefixNamespaces.value[selectedPrefix.value]
      ? prefixNamespaces.value[selectedPrefix.value]
      : '';

  if (!namespace) return row.about;
  if (row.about.startsWith(namespace)) return row.about;
  return `${namespace}${termNameFromIri(row.about)}`;
});

watch(
  () => data.data.value,
  async dataValue => {
    const resolvedContext = await jsonLdContextManager.syncFromData(dataValue);
    prefixNamespaces.value = extractPrefixNamespaces(resolvedContext);
    prefixes.value = Object.keys(prefixNamespaces.value);

    if (selectedPrefix.value && !prefixes.value.includes(selectedPrefix.value)) {
      selectedPrefix.value = null;
    }
  },
  {immediate: true, deep: true}
);

watch(
  selectedPrefix,
  async newPrefix => {
    statusMessage.value = '';
    ontologyRows.value = [];
    selectedDatatypeRow.value = null;
    selectedObjectRow.value = null;
    datatypeSearch.value = '';
    objectSearch.value = '';
    if (!newPrefix) {
      ontologyUrl.value = '';
      return;
    }
    ontologyUrl.value = ontologyCache.value[newPrefix]?.url ?? '';
    if (ontologyCache.value[newPrefix]) {
      await loadOntologyCards();
    }
  },
  {immediate: true}
);

watch(
  () => props.explorerMode,
  async () => {
    setFocusedTabFromMode();
    if (selectedCacheEntry.value) {
      await loadOntologyCards();
    }
  },
  {immediate: true}
);

async function downloadAndCacheOntology() {
  if (!selectedPrefix.value) {
    setStatus('Please select a prefix first.', 'warn');
    return;
  }

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
      throw new Error(`Download failed with HTTP ${response.status}.`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const format = detectRdfFormat(contentType, parsedUrl.toString());
    if (!format) {
      throw new Error('Only RDF files are supported.');
    }

    const content = await response.text();
    await validateRdf(content, parsedUrl.toString(), format);

    ontologyCache.value[selectedPrefix.value] = {
      prefix: selectedPrefix.value,
      url: parsedUrl.toString(),
      content,
      format,
      contentType,
      fetchedAt: new Date().toISOString(),
    };
    saveCacheToStorage(ontologyCache.value);
    await loadOntologyCards();

    setStatus(
      `Ontology for prefix "${selectedPrefix.value}" was downloaded and cached${
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

function validateRdf(content: string, baseUri: string, format: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const store = $rdf.graph();
    $rdf.parse(content, store as $rdf.Formula, baseUri, format, err => {
      if (err) {
        reject(new Error('The downloaded file is not valid RDF.'));
        return;
      }
      resolve();
    });
  });
}

async function loadOntologyCards() {
  const cacheEntry = selectedCacheEntry.value;
  if (!cacheEntry) {
    ontologyRows.value = [];
    return;
  }

  isQuerying.value = true;
  try {
    const query = buildOntologyQuery();
    const rows = await runSparqlOnCachedOntology(query, cacheEntry.content, cacheEntry.format);
    ontologyRows.value = rows;
  } catch (error: any) {
    ontologyRows.value = [];
    setStatus(error?.message ?? 'Failed to query ontology terms.', 'error');
  } finally {
    isQuerying.value = false;
  }
}

function buildOntologyQuery() {
  const namespace =
    selectedPrefix.value && prefixNamespaces.value[selectedPrefix.value]
      ? prefixNamespaces.value[selectedPrefix.value]
      : '';

  const namespaceFilter = namespace
    ? `FILTER(STRSTARTS(STR(?about), "${escapeForSparqlString(namespace)}"))`
    : '';

  return `
    SELECT ?about ?propertyType (SAMPLE(?commentTerm) AS ?comment) WHERE {
      ?about a ?propertyType .
      FILTER(
        ?propertyType IN (
          <http://www.w3.org/2002/07/owl#ObjectProperty>,
          <http://www.w3.org/2002/07/owl#DatatypeProperty>
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
    LIMIT 200
  `;
}

async function runSparqlOnCachedOntology(query: string, content: string, format: string) {
  const queryEngineCtor = (window as any)?.Comunica?.QueryEngine;
  if (!queryEngineCtor) {
    throw new Error('SPARQL engine is not available.');
  }

  const engine = new queryEngineCtor();
  const sources = [{type: 'serialized', value: content, mediaType: format}];
  const stream = await engine.queryBindings(query, {sources});

  const rows: Array<{
    about: string;
    comment: string;
    propertyType: 'ObjectProperty' | 'DatatypeProperty';
  }> = [];

  await new Promise<void>((resolve, reject) => {
    stream
      .on('data', (binding: any) => {
        const about = getBindingValue(binding, 'about');
        if (!about) return;
        const propertyTypeIri = getBindingValue(binding, 'propertyType');
        rows.push({
          about,
          comment: getBindingValue(binding, 'comment'),
          propertyType:
            propertyTypeIri === 'http://www.w3.org/2002/07/owl#DatatypeProperty'
              ? 'DatatypeProperty'
              : 'ObjectProperty',
        });
      })
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err));
  });

  return rows;
}

function setFocusedTabFromMode() {
  activePropertyTab.value =
    props.explorerMode === 'Predicate' ? 'ObjectProperty' : 'DatatypeProperty';
}

function filterRows(
  rows: Array<{
    about: string;
    comment: string;
    propertyType: 'ObjectProperty' | 'DatatypeProperty';
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

function escapeForSparqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function loadCacheFromStorage(): Record<string, CachedOntology> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, CachedOntology>;
  } catch {
    return {};
  }
}

function saveCacheToStorage(cache: Record<string, CachedOntology>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

function deleteCachedOntology() {
  if (!selectedPrefix.value) return;
  if (!ontologyCache.value[selectedPrefix.value]) return;

  delete ontologyCache.value[selectedPrefix.value];
  saveCacheToStorage(ontologyCache.value);
  ontologyRows.value = [];
  selectedDatatypeRow.value = null;
  selectedObjectRow.value = null;
  setStatus(`Cached ontology for prefix "${selectedPrefix.value}" was deleted.`, 'info');
}

function selectCurrentIri() {
  if (!selectedRowIri.value) return;
  emit('select-iri', selectedRowIri.value);
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
