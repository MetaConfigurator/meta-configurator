<template>
  <div class="sparql-editor-wrapper">
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="query">Query</Tab>
        <Tab value="result" :disabled="!enableResult">Result</Tab>
        <Tab value="visualizer" :disabled="!enableVisualization">Visualizer</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="query">
          <div class="query-panel">
            <ScrollPanel
              class="query-scrollpanel"
              style="width: 100%; height: 100%"
              :dt="{
                bar: {
                  background: '{primary.color}',
                },
              }">
              <div class="space-y-4 mb-2">
                <Accordion v-model:value="activeAccordion">
                  <AccordionPanel value="aiPanel">
                    <AccordionHeader>Use AI assistance to generate SPARQL queries</AccordionHeader>
                    <AccordionContent>
                      <PanelSettings
                        panel-name="API Key and AI Settings"
                        settings-header="AI Settings"
                        :panel-settings-path="['aiIntegration']"
                        :sessionMode="SessionMode.DataEditor">
                        <ApiKey />
                      </PanelSettings>
                      <ApiKeyWarning />
                      <Textarea
                        id="userComments"
                        v-model="userComments"
                        @click.stop
                        @keydown.stop
                        class="w-full mt-2"
                        placeholder="Describe the query you want. For example: 
What is the average age of all people?" />

                      <Message severity="warn" class="mb-2">
                        <span>Generated SPARQL queries may require manual review.</span>
                      </Message>
                      <Button
                        label="Suggest SPARQL Query"
                        icon="pi pi-wand"
                        @click="suggestSparqlQuery"
                        class="w-full"
                        :loading="isLoading" />
                    </AccordionContent>
                  </AccordionPanel>
                </Accordion>
              </div>
              <div class="editor-container mb-2">
                <SparqlQueryEditor
                  v-model="sparqlQuery"
                  :errorLine="errorLineNumber"
                  :errorMessage="errorMessage" />
              </div>
              <div class="editor-footer flex items-center w-full mb-2">
                <div class="flex items-center gap-2">
                  <ToggleSwitch v-model="enableVisualization">
                    <template #handle="{checked}">
                      <i :class="['!text-xs pi', {'pi-eye': checked, 'pi-eye-slash': !checked}]" />
                    </template>
                  </ToggleSwitch>
                  <span class="text-sm font-medium">
                    {{ enableVisualization ? 'Visualization On' : 'Visualization Off' }}
                  </span>
                </div>
                <Button
                  v-if="enableVisualization"
                  icon="pi pi-question-circle"
                  variant="text"
                  severity="warning"
                  @click="visualizationHelpDialog = true" />
                <div class="flex items-center gap-2 ml-auto">
                  <Button label="Run Query" icon="pi pi-play" @click="runQuery" />
                </div>
              </div>
            </ScrollPanel>
          </div>
          <Dialog
            v-model:visible="visualizationHelpDialog"
            header="Visualization Mode – Query Requirements"
            modal
            style="width: 500px">
            <div class="text-sm leading-relaxed">
              <p class="mb-3">
                <b>Visualization mode</b> works by directly consuming RDF triples. For this reason,
                only <b>SPARQL CONSTRUCT queries</b> are supported.
              </p>

              <p class="font-semibold mb-1">Required query structure:</p>
              <ul class="pl-4 list-disc mb-3">
                <li>The query <b>must be a CONSTRUCT query</b></li>
                <li>
                  The <code>CONSTRUCT</code> template must follow this exact pattern:
                  <pre
                    :class="[
                      'p-2 rounded text-xs overflow-auto !bg-gray-100',
                      isDarkMode && '!bg-gray-900',
                    ]"
                    >{{ visualizationQueryExample_1 }}
    </pre
                  >
                </li>
                <li>The <code>WHERE</code> clause may contain any valid SPARQL pattern</li>
                <li>
                  <code>?subject</code> and <code>?predicate</code> must always be a
                  <b>Named Node (IRI)</b>
                </li>
                <li><code>?object</code> may be IRI or literal</li>
              </ul>

              <p class="font-semibold mb-1">Example:</p>
              <pre
                :class="[
                  'p-2 rounded text-xs overflow-auto !bg-gray-100',
                  isDarkMode && '!bg-gray-900',
                ]"
                >{{ visualizationQueryExample_2 }}
    </pre
              >
            </div>
          </Dialog>
        </TabPanel>
        <TabPanel value="result">
          <div class="datatable-wrapper">
            <DataTable
              v-if="results.length"
              size="small"
              :value="results"
              scrollable
              stripedRows
              paginator
              frozenHeader
              resizableColumns
              v-model:filters="filters"
              filterDisplay="menu"
              scrollHeight="flex"
              :rows="50"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
              :rowsPerPageOptions="[10, 20, 50]"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords} results">
              <template v-if="columns.length > 0" #header>
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-2">
                    <Button
                      label="Export"
                      icon="pi pi-upload"
                      severity="contrast"
                      text
                      :disabled="!results.length"
                      @click="toggleExportPopover" />
                    <TieredMenu ref="exportPopover" :model="exportMenuItems" popup />
                  </div>
                  <IconField>
                    <Button
                      type="button"
                      icon="pi pi-filter-slash"
                      variant="text"
                      v-tooltip="'Clear all filters'"
                      @click="clearFilters()" />
                    <InputText v-model="filters['global'].value" placeholder="Search ..." />
                  </IconField>
                </div>
              </template>
              <Column
                v-for="col in columns"
                :key="col"
                :field="col"
                :header="col"
                sortable
                filter
                filterMatchMode="contains">
                <template #body="{data}">
                  {{ formatCellValue(data[col]) }}
                </template>
                <template #filter="{filterModel, filterCallback}">
                  <InputText
                    v-model="filterModel.value"
                    type="text"
                    @input="filterCallback()"
                    :placeholder="`Search by ${col}`"
                    class="p-column-filter" />
                </template>
              </Column>
            </DataTable>
            <Message v-else severity="warn"> No results. Please check your query. </Message>
          </div>
        </TabPanel>
        <TabPanel value="visualizer">
          <RdfVisualizer
            v-if="statements.length"
            :statements="statements"
            :readOnly="true"
            @cancel-render="visualizationCanceled" />
          <Message v-else severity="warn">
            No results. Please check your query and
            <a
              href="#"
              @click.prevent="openVisualizationHelpDialog"
              class="text-blue-600 hover:underline">
              notes </a
            >.
          </Message>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import {generateSparqlSuggestion} from '@/utility/ai/aiEndpoint';
import {trimDataToMaxSize} from '@/utility/trimData';
import {getDataForMode} from '@/data/useDataLink';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import {useErrorService} from '@/utility/errorServiceInstance';
import {fixGeneratedExpression, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {SessionMode} from '@/store/sessionMode';
import {Parser} from 'sparqljs';
import {ref, computed, watch} from 'vue';
import TieredMenu from 'primevue/tieredmenu';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {FilterMatchMode} from '@primevue/core/api';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import {isDarkMode} from '@/utility/darkModeUtils';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import Button from 'primevue/button';
import Tab from 'primevue/tab';
import Tabs from 'primevue/tabs';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import TabList from 'primevue/tablist';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import Dialog from 'primevue/dialog';
import {ScrollPanel} from 'primevue';
import * as $rdf from 'rdflib';
import RdfVisualizer from '@/components/panels/rdf/RdfVisualizer.vue';
import ToggleSwitch from 'primevue/toggleswitch';
import {
  defaultQueryTemplate,
  formatCellValue,
  visualizationQueryExample_1,
  visualizationQueryExample_2,
  visualizationQueryTemplate,
} from '@/components/panels/rdf/rdfUtils';
import {RdfTermType} from '@/components/panels/rdf/rdfUtils';
import {downloadFile} from '@/utility/rdfUtils';
import SparqlQueryEditor from '@/components/panels/rdf/SparqlQueryEditor.vue';

enum QueryResultMode {
  CONSTRUCT = 'construct',
  SELECT = 'select',
}

const queryMode = ref<QueryResultMode>(QueryResultMode.SELECT);
const isLoading = ref(false);
const userComments = ref('');
const result = ref('');
const statusMessage = ref('');
const activeAccordion = ref<string | null>(null);

let validateTimer: number | null = null;
const statements = ref<$rdf.Statement[]>([]);
const visualizationHelpDialog = ref(false);
const enableResult = ref(false);
const enableVisualization = ref(false);
const results = ref<Record<string, string>[]>([]);
const columns = ref<string[]>([]);
const exportPopover = ref();
const errorMessage = ref<string | null>(null);
const errorLineNumber = ref<number | null>(null);
const filters = ref<Record<string, any>>({});
const activeTab = ref('query');
const priority = ['?subject', '?predicate', '?object'];

const exportOnConstruct = [
  {
    label: 'Turtle',
    icon: 'pi pi-file',
    command: () => exportAs('text/turtle'),
  },
  {
    label: 'N-Triples',
    icon: 'pi pi-file',
    command: () => exportAs('application/n-triples'),
  },
  {
    label: 'RDF/XML',
    icon: 'pi pi-file',
    command: () => exportAs('application/rdf+xml'),
  },
];

const exportOnSelect = [
  {
    label: 'CSV',
    icon: 'pi pi-file',
    command: () => exportAsCsv(),
  },
];

async function suggestSparql(): Promise<{config: string; success: boolean; message: string}> {
  const inputDataSubset = trimDataToMaxSize(getDataForMode(SessionMode.DataEditor).data.value);
  const apiKey = getApiKey();
  const inputDataSubsetStr = JSON.stringify(inputDataSubset);

  const resultPromise = generateSparqlSuggestion(
    apiKey,
    inputDataSubsetStr,
    userComments.value,
    buildPrefixBlock(rdfStoreManager.namespaces.value),
    enableVisualization.value
  );

  const responseStr = await resultPromise;

  try {
    const fixedExpression = fixGeneratedExpression(responseStr, ['sparql']);
    return {
      config: fixedExpression,
      success: true,
      message: 'Data mapping suggestion generated successfully.',
    };
  } catch (e) {
    console.error('Error generating mapping suggestion: ', e);
    return {
      config: responseStr,
      success: false,
      message:
        'Failed to generate data mapping suggestion. Please check the console for more details.',
    };
  }
}

function suggestSparqlQuery() {
  isLoading.value = true;
  suggestSparql()
    .then(res => {
      result.value = res.config;
      if (res.success) {
        statusMessage.value = res.message;
        errorMessage.value = '';
      } else {
        statusMessage.value = '';
        errorMessage.value = res.message;
      }
      isLoading.value = false;
      setEditorText(res.config.trimStart(), false);
      activeAccordion.value = null;
    })
    .catch(error => {
      useErrorService().onError(error);
    })
    .finally(() => {
      isLoading.value = false;
    });
}

const buildPrefixBlock = (namespaces: Record<string, string>): string => {
  return Object.entries(namespaces)
    .filter(([prefix]) => prefix !== '@vocab')
    .map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`)
    .join('\n');
};

const applyPrefixesToQuery = (queryBody: string): string => {
  const prefixes = buildPrefixBlock(rdfStoreManager.namespaces.value);

  return prefixes ? `${prefixes}\n\n${queryBody}` : queryBody;
};

const sparqlQuery = ref(applyPrefixesToQuery(defaultQueryTemplate));

const clearFilters = () => {
  Object.values(filters.value).forEach(filter => {
    if (filter && typeof filter === 'object' && 'value' in filter) {
      filter.value = null;
    }
  });
};

const initFilters = (cols: string[]) => {
  const _filters: Record<string, any> = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
  };

  cols.forEach(col => {
    _filters[col] = {value: null, matchMode: FilterMatchMode.CONTAINS};
  });

  filters.value = _filters;
};

const sortColumns = (cols: string[]) => [
  ...priority.filter(c => cols.includes(c)),
  ...cols.filter(c => !priority.includes(c)),
];

const termToString = (term: any) =>
  term?.termType === RdfTermType.Literal ? term.value : term?.value ?? (term ? String(term) : '');

const rdfjsToRdflib = (term: any) => {
  if (!term) return null;
  if (term.termType === RdfTermType.NamedNode) return $rdf.sym(term.value);
  if (term.termType === RdfTermType.BlankNode) return $rdf.blankNode(term.value);
  if (term.termType === RdfTermType.Literal) {
    const langOrDt =
      term.language || (term.datatype?.value ? $rdf.sym(term.datatype.value) : undefined);
    return $rdf.literal(term.value, langOrDt);
  }
  return null;
};

const runQuery = async () => {
  results.value = [];
  columns.value = [];
  statements.value = [];
  errorMessage.value = null;
  errorLineNumber.value = null;

  if (!validateSparqlSyntax()) return;

  const engine = new (window as any).Comunica.QueryEngine();
  const {content} = rdfStoreManager.exportAs('application/n-triples');
  const sources = [{type: 'serialized', value: content, mediaType: 'application/n-triples'}];

  if (enableVisualization.value) {
    if (!isValidVisualizationConstruct(sparqlQuery.value)) {
      errorMessage.value =
        'Invalid CONSTRUCT query for visualization. Please ensure the query follows the required structure.';
      return;
    }
    await runConstructQuery(engine, sources);
  } else {
    await runSelectQuery(engine, sources);
  }

  enableResult.value = true;
};

const runConstructQuery = async (engine: any, sources: any[]) => {
  const stmts: $rdf.Statement[] = [];
  const computedColumns = ['?subject', '?predicate', '?object'];

  const finalize = () => {
    const sorted = sortColumns(computedColumns);
    columns.value = sorted;
    initFilters(sorted);

    queryMode.value = QueryResultMode.CONSTRUCT;
    statements.value = stmts;
    activeTab.value = 'visualizer';
  };

  const quadsStream = await engine.queryQuads(sparqlQuery.value, {sources});

  quadsStream
    .on('data', (q: any) => {
      results.value.push({
        '?subject': termToString(q.subject),
        '?predicate': termToString(q.predicate),
        '?object': termToString(q.object),
      });

      const s = rdfjsToRdflib(q.subject);
      const p = rdfjsToRdflib(q.predicate);
      const o = rdfjsToRdflib(q.object);

      if (
        s &&
        p &&
        o &&
        p.termType === RdfTermType.NamedNode &&
        s.termType !== RdfTermType.Literal
      ) {
        stmts.push(new $rdf.Statement(s as any, p as any, o as any));
      }
    })
    .on('end', finalize)
    .on('error', (e: any) => {
      errorMessage.value = String(e?.message ?? e);
      finalize();
    });
};

const runSelectQuery = async (engine: any, sources: any[]) => {
  try {
    const bindingsStream = await engine.queryBindings(sparqlQuery.value, {sources});
    const rows: Record<string, string>[] = [];

    const computedColumns =
      (await bindingsStream
        .getMetadata?.()
        .then((m: any) =>
          (m?.variables ?? []).map(
            (v: any) => `?${v.value ?? v.name ?? String(v).replace(/^\?/, '')}`
          )
        )
        .catch(() => [])) ?? [];

    const finalize = () => {
      const cols = rows.length ? Object.keys(rows[0]!) : computedColumns;
      const sorted = sortColumns(cols);

      queryMode.value = QueryResultMode.SELECT;
      columns.value = sorted;
      initFilters(sorted);
      activeTab.value = 'result';
    };

    bindingsStream
      .on('data', (binding: any) => {
        const row = Object.fromEntries(
          [...binding.keys()].map((v: any) => {
            const name = v.value ?? v.name ?? String(v).replace(/^\?/, '');
            return [`?${name}`, termToString(binding.get(v))];
          })
        ) as Record<string, string>;

        rows.push(row);
        results.value.push(row);
      })
      .on('end', finalize)
      .on('error', (e: any) => {
        errorMessage.value = String(e?.message ?? e);
        finalize();
      });
  } catch (e: any) {
    errorMessage.value = String(e?.message ?? e);
  }
};

const validateSparqlSyntax = (): boolean => {
  try {
    const parser = new Parser();
    parser.parse(sparqlQuery.value);
    return true;
  } catch (err: any) {
    errorMessage.value = err.message;
    const lineMatch = err.message?.match(/line[:\s]+(\d+)/i);
    if (lineMatch) {
      errorLineNumber.value = parseInt(lineMatch[1], 10);
    } else if (err.location?.start?.line) {
      errorLineNumber.value = err.location.start.line;
    } else {
      errorLineNumber.value = null;
    }
    return false;
  }
};

const setEditorText = (text: string, applyPrefixes: boolean = true) => {
  sparqlQuery.value = applyPrefixes ? applyPrefixesToQuery(text) : text;
};

watch(
  enableVisualization,
  on => {
    setEditorText(on ? visualizationQueryTemplate : defaultQueryTemplate);
  },
  {immediate: true}
);

const validateLive = () => {
  if (validateTimer) window.clearTimeout(validateTimer);

  validateTimer = window.setTimeout(() => {
    errorMessage.value = null;
    errorLineNumber.value = null;

    try {
      const parser = new Parser();
      parser.parse(sparqlQuery.value);
    } catch (err: any) {
      errorMessage.value = err.message;
      const lineMatch = err.message?.match(/line[:\s]+(\d+)/i);
      if (lineMatch) {
        errorLineNumber.value = parseInt(lineMatch[1], 10);
      } else if (err.location?.start?.line) {
        errorLineNumber.value = err.location.start.line;
      }
    }
  }, 250);
};

function serializeAsCsv() {
  if (!results.value.length || !columns.value.length) return '';

  const escapeCell = (value: string) => {
    if (value.includes('"')) value = value.replace(/"/g, '""');
    if (/[",\n\r]/.test(value)) return `"${value}"`;
    return value;
  };

  const rows = [
    columns.value.join(','),
    ...results.value.map(row =>
      columns.value.map(col => escapeCell(String(row[col] ?? ''))).join(',')
    ),
  ];

  return rows.join('\n');
}

function exportAs(format: string) {
  const serialized = rdfStoreManager.exportAs(format, statements.value);
  downloadFile(serialized.content, format);
}

function exportAsCsv() {
  const serialized = serializeAsCsv();
  downloadFile(serialized, 'text/csv');
}

function isValidVisualizationConstruct(query: string): boolean {
  const normalized = query
    .replace(/#[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const constructPattern = /construct\s*\{\s*\?subject\s+\?predicate\s+\?object\s*\.\s*\}/;

  return constructPattern.test(normalized);
}

watch(sparqlQuery, () => {
  validateLive();
});

const exportMenuItems = computed(() =>
  queryMode.value === QueryResultMode.CONSTRUCT ? exportOnConstruct : exportOnSelect
);

function openVisualizationHelpDialog() {
  visualizationHelpDialog.value = true;
}

function visualizationCanceled() {
  activeTab.value = 'query';
}

const toggleExportPopover = (event: Event) => {
  exportPopover.value.toggle(event);
};
</script>

<style scoped>
.sparql-editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

:deep(.p-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.p-tabpanels) {
  flex: 1;
  overflow: hidden;
}

:deep(.p-tabpanel) {
  height: 100%;
}

.query-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0.5rem;
}

.editor-container {
  flex: 1;
  min-height: 0;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.datatable-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.p-datatable) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.p-datatable-wrapper) {
  flex: 1;
  overflow: auto;
}

:deep(.p-tabpanel[value='query']) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.query-panel {
  flex: 1;
  min-height: 0;
}

:deep(.query-scrollpanel) {
  flex: 1;
  min-height: 0;
}

:deep(.query-scrollpanel .p-scrollpanel-content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.query-scrollpanel .p-scrollpanel-content > .space-y-4) {
  flex-shrink: 0;
}

.editor-footer {
  flex-shrink: 0;
}
</style>
