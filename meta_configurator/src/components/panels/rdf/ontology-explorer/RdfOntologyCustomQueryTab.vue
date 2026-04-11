<template>
  <div class="tabs-wrapper">
    <Tabs v-model:value="activeCustomQueryTab" class="tabs">
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
                v-model="customSparqlQuery"
                :errorLine="customQueryErrorLineNumber"
                :errorMessage="customQueryErrorMessage" />
              <Button
                label="Run Query"
                icon="pi pi-play"
                size="small"
                class="run-query-button"
                :style="{bottom: `${runQueryButtonBottomOffset}px`}"
                :loading="isRunningCustomQuery"
                :disabled="!props.selectedCacheEntry || !customSparqlQuery.trim()"
                @click="runCustomSparqlQuery" />
            </div>
          </div>
        </TabPanel>
        <TabPanel value="results">
          <div class="results-panel">
            <div class="table-search mb-2">
              <InputText
                v-model.trim="customTableSearch"
                placeholder="Search query results"
                class="w-full" />
            </div>
            <div class="results-table-wrapper">
              <DataTable
                class="results-table"
                :value="filteredCustomQueryRows"
                v-model:first="customQueryFirst"
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
                  v-for="column in customQueryColumns"
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
                      @click="onCustomQueryValueClick(data[column])">
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
type CustomQueryRow = Record<string, string>;

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

const customTableSearch = ref('');
const customQueryFirst = ref(0);
const customSparqlQuery = ref(props.defaultQuery);
const customQueryRows = ref<CustomQueryRow[]>([]);
const selectedCustomQueryIri = ref('');
const isRunningCustomQuery = ref(false);
const customQueryErrorLineNumber = ref<number | null>(null);
const customQueryErrorMessage = ref<string | null>(null);
const activeCustomQueryTab = ref<'query' | 'results'>('query');
const editorRef = ref<any>(null);
const runQueryButtonBottomOffset = ref(12);
let customQueryValidateTimer: number | null = null;

const filteredCustomQueryRows = computed(() =>
  filterCustomQueryRows(customQueryRows.value, customTableSearch.value)
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

watch(
  () => props.selectedCacheEntry,
  entry => {
    customQueryRows.value = [];
    selectedCustomQueryIri.value = '';
    customQueryFirst.value = 0;
    customTableSearch.value = '';
    activeCustomQueryTab.value = 'query';
    customSparqlQuery.value = entry?.lastCustomSparqlQuery ?? props.defaultQuery;
    customQueryErrorLineNumber.value = null;
    customQueryErrorMessage.value = null;
    emit('select-iri', '');
  },
  {immediate: true}
);

watch(customSparqlQuery, () => {
  validateCustomQueryLive();
});

watch(
  customQueryErrorMessage,
  () => {
    updateRunQueryButtonOffset();
  },
  {immediate: true}
);

async function runCustomSparqlQuery() {
  const entry = props.selectedCacheEntry;
  if (!entry) {
    emit('status', {
      message: 'Please select a prefix with a cached ontology first.',
      severity: RdfStatusSeverity.Warn,
    });
    return;
  }

  const query = customSparqlQuery.value;
  if (!query.trim()) {
    emit('status', {message: 'Please enter a SPARQL query.', severity: RdfStatusSeverity.Warn});
    return;
  }
  if (!validateCustomSparqlSyntax(query, false)) {
    return;
  }
  customQueryErrorMessage.value = null;

  const queryEngineCtor = (window as any)?.Comunica?.QueryEngine;
  if (!queryEngineCtor) {
    emit('status', {message: 'SPARQL engine is not available.', severity: RdfStatusSeverity.Error});
    return;
  }

  isRunningCustomQuery.value = true;
  activeCustomQueryTab.value = 'results';
  try {
    const cacheEntry = await props.ensureCacheEntryGraph(entry);
    const cacheEntryWithQuery: CachedOntology = {
      ...cacheEntry,
      lastCustomSparqlQuery: query,
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
    emit('select-iri', '');
    emit('status', {
      message: `Custom query returned ${rows.length} row(s).`,
      severity: RdfStatusSeverity.Success,
    });
  } catch (error: any) {
    customQueryErrorMessage.value = error?.message ?? 'Failed to execute custom query.';
    emit('status', {
      message: error?.message ?? 'Failed to execute custom query.',
      severity: RdfStatusSeverity.Error,
    });
  } finally {
    isRunningCustomQuery.value = false;
  }
}

function validateCustomSparqlSyntax(query: string, silent: boolean): boolean {
  const result = validateSparqlSyntax(query);
  if (result.valid) {
    customQueryErrorLineNumber.value = null;
    customQueryErrorMessage.value = null;
    return true;
  }

  customQueryErrorLineNumber.value = result.errorLine;
  customQueryErrorMessage.value = result.errorMessage ?? 'Invalid SPARQL query syntax.';
  if (!silent) {
    emit('status', {
      message: result.errorMessage ?? 'Invalid SPARQL query syntax.',
      severity: RdfStatusSeverity.Error,
    });
  }
  return false;
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

function filterCustomQueryRows(rows: CustomQueryRow[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter(row =>
    Object.values(row).some(value => value.toLowerCase().includes(normalized))
  );
}

function onCustomQueryValueClick(rawValue: unknown) {
  const iri = normalizePotentialIri(rawValue);
  selectedCustomQueryIri.value = iri && jsonLdContextManager.isIRI(iri) ? iri : '';
  emit('select-iri', selectedCustomQueryIri.value);
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
