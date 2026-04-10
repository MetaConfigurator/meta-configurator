<template>
  <div class="custom-query-tabs-wrapper">
    <Tabs v-model:value="activeCustomQueryTab" class="custom-query-tabs">
      <TabList>
        <Tab value="query">Query</Tab>
        <Tab value="results">Results</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="query">
          <div class="custom-query-panel-content">
            <div class="custom-query-editor">
              <SparqlQueryEditor
                v-model="customSparqlQuery"
                :errorLine="customQueryErrorLineNumber"
                :errorMessage="customQueryErrorMessage" />
            </div>
            <div class="flex justify-end">
              <Button
                label="Run Query"
                icon="pi pi-play"
                size="small"
                :loading="isRunningCustomQuery"
                :disabled="!props.selectedCacheEntry || !customSparqlQuery.trim()"
                @click="runCustomSparqlQuery" />
            </div>
          </div>
        </TabPanel>
        <TabPanel value="results">
          <div class="custom-query-results-panel">
            <div class="table-search mb-2">
              <InputText
                v-model.trim="customTableSearch"
                placeholder="Search query results"
                class="w-full" />
            </div>
            <div class="custom-query-results-table-wrapper">
              <DataTable
                class="custom-query-results-table"
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
                      class="custom-query-cell"
                      :class="{iri: isLikelyIri(normalizePotentialIri(data[column]))}"
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
import {computed, ref, watch} from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tab from 'primevue/tab';
import Tabs from 'primevue/tabs';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import TabList from 'primevue/tablist';
import SparqlQueryEditor from '@/components/panels/rdf/SparqlQueryEditor.vue';
import type {RdfCachedOntology} from '@/components/panels/rdf/rdfIndexedDbManager';
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
  selectedCustomQueryIri.value = iri && isLikelyIri(iri) ? iri : '';
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

function isLikelyIri(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('_:')) return false;
  if (/\s/.test(value)) return false;
  return /^[A-Za-z][A-Za-z0-9+.-]*:.+/.test(value);
}
</script>

<style scoped>
.custom-query-tabs-wrapper {
  height: 100%;
  min-height: 0;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.custom-query-tabs {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.custom-query-tabs :deep(.p-tabpanels) {
  flex: 1;
  min-height: 0;
  padding-top: 0.5rem;
}

.custom-query-tabs :deep(.p-tabpanel) {
  height: 100%;
  min-height: 0;
  padding: 0;
}

.custom-query-panel-content {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  color: var(--p-primary-color);
  text-decoration: underline;
}

.custom-query-editor {
  flex: 1;
  min-height: 0;
}

.custom-query-results-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.custom-query-results-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow-x: auto;
}

.custom-query-results-table {
  height: 100%;
}

.custom-query-results-table :deep(.p-datatable) {
  height: 100%;
}

.custom-query-results-table :deep(.p-datatable-table-container) {
  overflow-x: auto !important;
}

.custom-query-results-table :deep(.p-datatable-table) {
  width: max-content;
  min-width: 100%;
}

.custom-query-results-table :deep(.p-datatable-thead > tr > th),
.custom-query-results-table :deep(.p-datatable-tbody > tr > td) {
  white-space: nowrap;
}

.custom-query-results-table :deep(.custom-query-cell) {
  display: inline-block;
  width: max-content;
  max-width: none;
  white-space: nowrap;
}
</style>
