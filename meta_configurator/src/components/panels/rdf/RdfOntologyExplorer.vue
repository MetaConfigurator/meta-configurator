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
          <OntologyTermTabs
            v-model="activePropertyTab"
            :rows="ontologyRows"
            :sourceField="props.sourceField"
            :selectedPrefix="selectedPrefix"
            :prefixNamespaces="prefixNamespaces"
            :initialIri="pendingInitialIri"
            :rowsPerPage="ROWS_PER_PAGE"
            @preview-iri="onOntologyPreviewIri">
            <template #extra-tabs>
              <Tab :value="ONTOLOGY_EXPLORER_TAB.CustomQuery">Custom Query</Tab>
            </template>
            <template #extra-panels>
              <TabPanel :value="ONTOLOGY_EXPLORER_TAB.CustomQuery">
                <OntologyCustomQueryTab
                  :selectedCacheEntry="selectedCacheEntry"
                  :rowsPerPage="ROWS_PER_PAGE"
                  :defaultQuery="DEFAULT_CUSTOM_SPARQL_QUERY"
                  :ensureCacheEntryGraph="ensureCacheEntryGraph"
                  :putOntologyToIndexedDb="putOntologyToIndexedDb"
                  @select-iri="onCustomQueryIriSelect"
                  @status="onCustomQueryStatus" />
              </TabPanel>
            </template>
          </OntologyTermTabs>
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
import {computed, ref, watch} from 'vue';
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
import Tab from 'primevue/tab';
import TabPanel from 'primevue/tabpanel';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';
import OntologyTermTabs from '@/components/panels/rdf/OntologyTermTabs.vue';
import OntologyCustomQueryTab from '@/components/panels/rdf/OntologyCustomQueryTab.vue';
import {
  deleteOntologyFromRdfCache,
  getOntologyFromRdfCache,
  putOntologyInRdfCache,
  type RdfCachedOntology,
  type RdfOntologyRow,
} from '@/components/panels/rdf/rdfIndexedDbManager';
import {
  OntologyAccordionSection,
  OntologyExplorerTab,
  RdfBindingName,
  RdfMediaType,
  RdfPredicateIri,
  RdfPropertyType,
  RdfPropertyTypeIri,
  RdfProxyPath,
  RdfStatusSeverity,
} from '@/components/panels/rdf/rdfEnums';

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
const statusSeverity = ref<RdfStatusSeverity>(RdfStatusSeverity.Info);
const isQuerying = ref(false);
const ontologyRows = ref<OntologyRow[]>([]);
const ROWS_PER_PAGE = 100;
const activePropertyTab = ref<OntologyExplorerTab>(OntologyExplorerTab.ObjectProperty);
const selectedOntologyTabIri = ref('');
const DEFAULT_CUSTOM_SPARQL_QUERY = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100';
const selectedCustomQueryIri = ref('');
const pendingInitialIri = ref('');
const isAutoSelectingPrefix = ref(false);
const activeAccordion = ref<OntologyAccordionSection | null>(OntologyAccordionSection.Controls);
const deleteDialog = ref(false);
const ontologyFileUploadRef = ref<any | null>(null);

type CachedOntology = RdfCachedOntology;
type OntologyRow = RdfOntologyRow;

const ONTOLOGY_EXPLORER_TAB = OntologyExplorerTab;
const ONTOLOGY_ACCORDION_SECTION = OntologyAccordionSection;

const ACCEPT_RDF_HEADER = `${RdfMediaType.RdfXml}, ${RdfMediaType.Turtle}, ${RdfMediaType.XTurtle}, ${RdfMediaType.NTriples}, ${RdfMediaType.N3}, ${RdfMediaType.JsonLd}, ${RdfMediaType.Json}, ${RdfMediaType.Xml}, ${RdfMediaType.TextXml}, ${RdfMediaType.TextPlain}`;
const RDF_FILE_ACCEPT = `.rdf,.owl,.xml,.ttl,.nt,.n3,.jsonld,.json,${RdfMediaType.RdfXml},${RdfMediaType.Turtle},${RdfMediaType.XTurtle},${RdfMediaType.NTriples},${RdfMediaType.N3},${RdfMediaType.JsonLd},${RdfMediaType.Json},${RdfMediaType.Xml},${RdfMediaType.TextXml},${RdfMediaType.TextPlain}`;
const loadedCacheEntry = ref<CachedOntology | null>(null);
let prefixLookupRequestId = 0;

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
  return activePropertyTab.value === OntologyExplorerTab.CustomQuery
    ? selectedCustomQueryIri.value
    : selectedOntologyTabIri.value;
});
const canSelectCurrentIri = computed(() => isLikelyIri(selectedRowIri.value));

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
  selectedPrefix,
  async newPrefix => {
    const requestId = ++prefixLookupRequestId;
    if (isAutoSelectingPrefix.value) {
      isAutoSelectingPrefix.value = false;
    }
    statusMessage.value = '';
    ontologyRows.value = [];
    selectedCustomQueryIri.value = '';
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
      sourceField === 'Object' ? OntologyExplorerTab.Class : OntologyExplorerTab.ObjectProperty;
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

async function downloadAndCacheOntology() {
  if (!selectedPrefix.value) {
    setStatus('Please select a prefix first.', RdfStatusSeverity.Warn);
    return;
  }
  const ontologyPrefix = selectedPrefix.value;
  const ontologyIri = getOntologyIriForPrefix(ontologyPrefix);
  if (!ontologyIri) {
    setStatus(
      `No ontology IRI found in @context for prefix "${ontologyPrefix}".`,
      RdfStatusSeverity.Warn
    );
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(ontologyUrl.value);
  } catch {
    setStatus('Please enter a valid URL.', RdfStatusSeverity.Warn);
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
      ontologyIri,
      url: parsedUrl.toString(),
      rawContent: content,
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
      RdfStatusSeverity.Success
    );
  } catch (error: any) {
    setStatus(error?.message ?? 'Failed to download ontology.', RdfStatusSeverity.Error);
  } finally {
    isDownloading.value = false;
  }
}

/**
 * Handles user-uploaded ontology files and stores the parsed graph cache.
 */
async function onOntologyFileSelected(event: any) {
  const file = Array.isArray(event?.files) ? event.files[0] : null;
  if (!file) return;

  if (!selectedPrefix.value) {
    setStatus('Please select a prefix first.', RdfStatusSeverity.Warn);
    ontologyFileUploadRef.value?.clear?.();
    return;
  }
  const ontologyPrefix = selectedPrefix.value;
  const ontologyIri = getOntologyIriForPrefix(ontologyPrefix);
  if (!ontologyIri) {
    setStatus(
      `No ontology IRI found in @context for prefix "${ontologyPrefix}".`,
      RdfStatusSeverity.Warn
    );
    ontologyFileUploadRef.value?.clear?.();
    return;
  }

  isUploading.value = true;
  setStatus('');

  try {
    const contentType = file.type || RdfMediaType.OctetStream;
    const format = detectRdfFormat(contentType, file.name);
    if (!format) {
      throw new Error('Only RDF files are supported.');
    }

    const content = await file.text();
    const fileUrl = `file://${encodeURIComponent(file.name)}`;
    const store = await parseRdfToStore(content, fileUrl, format);
    const mergedGraphNTriples = serializeStoreToNTriples(store);

    const cacheEntry: CachedOntology = {
      ontologyIri,
      url: fileUrl,
      rawContent: content,
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
      RdfStatusSeverity.Success
    );
  } catch (error: any) {
    setStatus(error?.message ?? 'Failed to upload ontology file.', RdfStatusSeverity.Error);
  } finally {
    isUploading.value = false;
    ontologyFileUploadRef.value?.clear?.();
  }
}

/**
 * Fetches RDF content directly and falls back to the local proxy when CORS/network blocks direct access.
 */
async function fetchOntologyWithCorsFallback(
  targetUrl: string
): Promise<{response: Response; usedProxy: boolean}> {
  try {
    const directResponse = await fetch(targetUrl, {
      headers: {Accept: ACCEPT_RDF_HEADER},
    });
    return {response: directResponse, usedProxy: false};
  } catch {
    const proxyUrl = `${RdfProxyPath.Endpoint}?url=${encodeURIComponent(targetUrl)}`;
    const proxiedResponse = await fetch(proxyUrl, {
      headers: {Accept: ACCEPT_RDF_HEADER},
    });
    return {response: proxiedResponse, usedProxy: true};
  }
}

/**
 * Detects an rdflib-compatible parser format from response content-type and URL/file extension.
 */
function detectRdfFormat(contentTypeHeader: string, url: string): string | null {
  const contentType = contentTypeHeader.split(';')[0]!.trim().toLowerCase();
  const normalizedUrl = url.toLowerCase();

  if (contentType === RdfMediaType.RdfXml) return RdfMediaType.RdfXml;
  if (contentType === RdfMediaType.Xml || contentType === RdfMediaType.TextXml)
    return RdfMediaType.RdfXml;
  if (contentType === RdfMediaType.Turtle || contentType === RdfMediaType.XTurtle)
    return RdfMediaType.Turtle;
  if (contentType === RdfMediaType.NTriples) return RdfMediaType.NTriples;
  if (contentType === RdfMediaType.N3) return RdfMediaType.N3;
  if (contentType === RdfMediaType.JsonLd) return RdfMediaType.JsonLd;
  if (contentType === RdfMediaType.Json) return RdfMediaType.JsonLd;

  if (contentType === RdfMediaType.TextPlain || contentType === RdfMediaType.OctetStream) {
    if (normalizedUrl.endsWith('.nt')) return RdfMediaType.NTriples;
    if (normalizedUrl.endsWith('.ttl')) return RdfMediaType.Turtle;
    if (normalizedUrl.endsWith('.n3')) return RdfMediaType.N3;
    if (
      normalizedUrl.endsWith('.rdf') ||
      normalizedUrl.endsWith('.owl') ||
      normalizedUrl.endsWith('.xml')
    ) {
      return RdfMediaType.RdfXml;
    }
    if (normalizedUrl.endsWith('.jsonld') || normalizedUrl.endsWith('.json'))
      return RdfMediaType.JsonLd;
  }

  if (
    normalizedUrl.endsWith('.rdf') ||
    normalizedUrl.endsWith('.owl') ||
    normalizedUrl.endsWith('.xml')
  ) {
    return RdfMediaType.RdfXml;
  }
  if (normalizedUrl.endsWith('.ttl')) return RdfMediaType.Turtle;
  if (normalizedUrl.endsWith('.nt')) return RdfMediaType.NTriples;
  if (normalizedUrl.endsWith('.n3')) return RdfMediaType.N3;
  if (normalizedUrl.endsWith('.jsonld') || normalizedUrl.endsWith('.json'))
    return RdfMediaType.JsonLd;

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

/**
 * Loads ontology cards from cache or recomputes them by running the predefined ontology query.
 */
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

    const query = buildOntologyQuery();
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
          <${RdfPropertyTypeIri.OwlObjectProperty}>,
          <${RdfPropertyTypeIri.OwlDatatypeProperty}>,
          <${RdfPropertyTypeIri.RdfProperty}>,
          <${RdfPropertyTypeIri.RdfsClass}>,
          <${RdfPropertyTypeIri.OwlClass}>
        )
      )
      ${namespaceFilter}
      OPTIONAL {
        ?about <${RdfPredicateIri.RdfsComment}> ?commentTerm .
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

function getBindingValue(binding: any, name: string): string {
  for (const key of binding.keys()) {
    const keyName = key?.value ?? key?.name ?? String(key).replace(/^\?/, '');
    if (keyName === name) {
      return binding.get(key)?.value ?? '';
    }
  }
  return '';
}

function escapeForSparqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
      selectedCustomQueryIri.value = '';
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

function onCustomQueryIriSelect(iri: string) {
  selectedCustomQueryIri.value = iri;
}

function onCustomQueryStatus(payload: {message: string; severity: RdfStatusSeverity}) {
  setStatus(payload.message, payload.severity);
}

function onOntologyPreviewIri(iri: string) {
  selectedOntologyTabIri.value = iri;
  if (iri) {
    pendingInitialIri.value = '';
  }
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

function normalizeIri(value: string | undefined): string {
  return (value ?? '').trim();
}

function setStatus(message: string, severity: RdfStatusSeverity = RdfStatusSeverity.Info) {
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
