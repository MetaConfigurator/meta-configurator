<template>
  <div class="tabs-wrapper">
    <Tabs v-model:value="activeSparqlTab" class="tabs">
      <TabList>
        <Tab value="query">Query</Tab>
        <Tab value="results">Results</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="query">
          <div class="panel-content">
            <div class="editor">
              <SparqlQueryEditor
                ref="editorRef"
                class="editor-instance"
                v-model="sparqlQuery"
                :errorLine="queryErrorLineNumber"
                :errorMessage="queryErrorMessage" />
              <Button
                label="Run Query"
                icon="pi pi-play"
                size="small"
                class="run-query-button"
                :style="{bottom: `${runQueryButtonBottomOffset}px`}"
                :loading="isRunningQuery"
                :disabled="!props.selectedCacheEntry || !sparqlQuery.trim()"
                @click="runSparqlQuery" />
            </div>
          </div>
        </TabPanel>
        <TabPanel value="results">
          <div class="results-panel">
            <div class="table-search mb-2">
              <InputText
                v-model.trim="tableSearch"
                placeholder="Search query results"
                class="w-full" />
            </div>
            <div class="results-table-wrapper">
              <DataTable
                class="results-table"
                :value="filteredQueryRows"
                v-model:first="queryFirst"
                size="small"
                stripedRows
                paginator
                :rows="props.rowsPerPage"
                scrollable
                frozenHeader
                resizableColumns
                scrollHeight="flex"
                scrollDirection="both">
                <Column
                  v-for="column in queryColumns"
                  :key="column"
                  :field="column"
                  :header="column">
                  <template #body="{data}">
                    <button
                      type="button"
                      class="cell"
                      :class="{
                        iri: jsonLdContextManager.isIRI(normalizePotentialIri(data[column])),
                      }"
                      @click="onQueryValueClick(data[column])">
                      {{ data[column] }}
                    </button>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tab from 'primevue/tab';
import Tabs from 'primevue/tabs';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import TabList from 'primevue/tablist';
import SparqlQueryEditor from '@/components/panels/rdf/sparql-editor/SparqlQueryEditor.vue';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';
import type {RdfCachedOntology} from '@/components/panels/rdf/ontology-explorer/rdfIndexedDbManager';
import {RdfMediaType, RdfStatusSeverity} from '@/components/panels/rdf/rdfEnums';
import {validateSparqlSyntax} from '@/components/panels/rdf/rdfUtils';

type CachedOntology = RdfCachedOntology;
type QueryRow = Record<string, string>;

const props = defineProps<{
  selectedCacheEntry: CachedOntology | null;
  rowsPerPage: number;
  defaultQuery: string;
  ensureCacheEntryGraph: (entry: CachedOntology) => Promise<CachedOntology>;
  putOntologyToIndexedDb: (entry: CachedOntology) => Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'select-iri', iri: string): void;
  (e: 'status', payload: {message: string; severity: RdfStatusSeverity}): void;
}>();

const tableSearch = ref('');
const queryFirst = ref(0);
const sparqlQuery = ref(props.defaultQuery);
const queryRows = ref<QueryRow[]>([]);
const selectedQueryIri = ref('');
const isRunningQuery = ref(false);
const queryErrorLineNumber = ref<number | null>(null);
const queryErrorMessage = ref<string | null>(null);
const activeSparqlTab = ref<'query' | 'results'>('query');
const editorRef = ref<any>(null);
const runQueryButtonBottomOffset = ref(12);
let queryValidateTimer: number | null = null;

const filteredQueryRows = computed(() => filterQueryRows(queryRows.value, tableSearch.value));
const queryColumns = computed(() => {
  const columns = new Set<string>();
  for (const row of queryRows.value) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return Array.from(columns);
});

watch(
  () => props.selectedCacheEntry,
  entry => {
    queryRows.value = [];
    selectedQueryIri.value = '';
    queryFirst.value = 0;
    tableSearch.value = '';
    activeSparqlTab.value = 'query';
    sparqlQuery.value = entry?.lastSparqlQuery ?? props.defaultQuery;
    queryErrorLineNumber.value = null;
    queryErrorMessage.value = null;
    emit('select-iri', '');
  },
  {immediate: true}
);

watch(sparqlQuery, () => {
  validateQueryLive();
});

watch(
  queryErrorMessage,
  () => {
    updateRunQueryButtonOffset();
  },
  {immediate: true}
);

async function runSparqlQuery() {
  const entry = props.selectedCacheEntry;
  if (!entry) {
    emit('status', {
      message: 'Please select a prefix with a cached ontology first.',
      severity: RdfStatusSeverity.Warn,
    });
    return;
  }

  const query = sparqlQuery.value;
  if (!query.trim()) {
    emit('status', {message: 'Please enter a SPARQL query.', severity: RdfStatusSeverity.Warn});
    return;
  }
  if (!validateTabSparqlSyntax(query, false)) {
    return;
  }
  queryErrorMessage.value = null;

  const queryEngineCtor = (window as any)?.Comunica?.QueryEngine;
  if (!queryEngineCtor) {
    emit('status', {message: 'SPARQL engine is not available.', severity: RdfStatusSeverity.Error});
    return;
  }

  isRunningQuery.value = true;
  activeSparqlTab.value = 'results';
  try {
    const cacheEntry = await props.ensureCacheEntryGraph(entry);
    const cacheEntryWithQuery: CachedOntology = {
      ...cacheEntry,
      lastSparqlQuery: query,
    };
    try {
      await props.putOntologyToIndexedDb(cacheEntryWithQuery);
    } catch (persistError: any) {
      emit('status', {
        message: persistError?.message ?? 'Query was executed but could not be cached.',
        severity: RdfStatusSeverity.Warn,
      });
    }

    const graphNTriples = cacheEntry.mergedGraphNTriples ?? '';
    const engine = new queryEngineCtor();
    const sources = [{type: 'serialized', value: graphNTriples, mediaType: RdfMediaType.NTriples}];
    const stream = await engine.queryBindings(query, {sources});
    const rows: QueryRow[] = [];

    await new Promise<void>((resolve, reject) => {
      stream
        .on('data', (binding: any) => {
          const row: QueryRow = {};
          for (const key of binding.keys()) {
            const keyName = key?.value ?? key?.name ?? String(key).replace(/^\?/, '');
            row[keyName] = binding.get(key)?.value ?? '';
          }
          rows.push(row);
        })
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err));
    });

    queryRows.value = rows;
    queryFirst.value = 0;
    selectedQueryIri.value = '';
    queryErrorMessage.value = null;
    emit('select-iri', '');
    emit('status', {
      message: `SPARQL query returned ${rows.length} row(s).`,
      severity: RdfStatusSeverity.Success,
    });
  } catch (error: any) {
    queryErrorMessage.value = error?.message ?? 'Failed to execute SPARQL query.';
    emit('status', {
      message: error?.message ?? 'Failed to execute SPARQL query.',
      severity: RdfStatusSeverity.Error,
    });
  } finally {
    isRunningQuery.value = false;
  }
}

function validateTabSparqlSyntax(query: string, silent: boolean): boolean {
  const result = validateSparqlSyntax(query);
  if (result.valid) {
    queryErrorLineNumber.value = null;
    queryErrorMessage.value = null;
    return true;
  }

  queryErrorLineNumber.value = result.errorLine;
  queryErrorMessage.value = result.errorMessage ?? 'Invalid SPARQL query syntax.';
  if (!silent) {
    emit('status', {
      message: result.errorMessage ?? 'Invalid SPARQL query syntax.',
      severity: RdfStatusSeverity.Error,
    });
  }
  return false;
}

function validateQueryLive() {
  if (queryValidateTimer) {
    window.clearTimeout(queryValidateTimer);
  }
  queryValidateTimer = window.setTimeout(() => {
    const query = sparqlQuery.value;
    if (!query.trim()) {
      queryErrorLineNumber.value = null;
      queryErrorMessage.value = null;
      return;
    }
    validateTabSparqlSyntax(query, true);
  }, 250);
}

function filterQueryRows(rows: QueryRow[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter(row =>
    Object.values(row).some(value => value.toLowerCase().includes(normalized))
  );
}

function onQueryValueClick(rawValue: unknown) {
  const iri = normalizePotentialIri(rawValue);
  selectedQueryIri.value = iri && jsonLdContextManager.isIRI(iri) ? iri : '';
  emit('select-iri', selectedQueryIri.value);
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

function updateRunQueryButtonOffset() {
  void nextTick(() => {
    const editorRoot = editorRef.value?.$el as HTMLElement | undefined;
    const errorBox = editorRoot?.querySelector('.error-box') as HTMLElement | null;
    const errorHeight = errorBox ? errorBox.offsetHeight + 8 : 0;
    runQueryButtonBottomOffset.value = 12 + errorHeight;
  });
}
</script>

<style scoped>
.tabs-wrapper {
  height: 100%;
  min-height: 0;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.tabs {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabs :deep(.p-tabpanels) {
  flex: 1;
  min-height: 0;
  padding-top: 0.5rem;
}

.tabs :deep(.p-tabpanel) {
  height: 100%;
  min-height: 0;
  padding: 0;
}

.panel-content {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cell {
  all: unset;
  display: block;
  width: 100%;
  cursor: default;
  color: inherit;
}

.cell.iri {
  cursor: pointer;
  color: var(--p-primary-color);
  text-decoration: underline;
}

.editor {
  flex: 1;
  min-height: 0;
  position: relative;
}

.editor-instance {
  height: 100%;
}

.editor :deep(.cm-scroller) {
  padding-bottom: 3.25rem;
}

.run-query-button {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 2;
}

.results-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.results-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow-x: auto;
}

.results-table {
  height: 100%;
}

.results-table :deep(.p-datatable) {
  height: 100%;
}

.results-table :deep(.p-datatable-table-container) {
  overflow-x: auto !important;
}

.results-table :deep(.p-datatable-table) {
  width: max-content;
  min-width: 100%;
}

.results-table :deep(.p-datatable-thead > tr > th),
.results-table :deep(.p-datatable-tbody > tr > td) {
  white-space: nowrap;
}

.results-table :deep(.cell) {
  display: inline-block;
  width: max-content;
  max-width: none;
  white-space: nowrap;
}
</style>
