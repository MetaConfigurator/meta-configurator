<template>
  <div class="sparql-editor-wrapper">
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="query">Query</Tab>
        <Tab value="result">Result</Tab>
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
                <Accordion>
                  <AccordionPanel value="ai">
                    <AccordionHeader>Use AI to help generate SPARQL query</AccordionHeader>
                    <AccordionContent>
                      <PanelSettings
                        panel-name="API Key and AI Settings"
                        settings-header="AI Settings"
                        :panel-settings-path="['aiIntegration']"
                        :sessionMode="SessionMode.DataEditor">
                        <ApiKey />
                      </PanelSettings>
                      <ApiKeyWarning />
                      <div>
                        <Textarea
                          id="userComments"
                          v-model="userComments"
                          class="w-full mt-2 mb-2"
                          placeholder="e.g., create a sparql query to list all cities in the JSON-LD." />
                      </div>
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
                <codemirror
                  v-model="sparqlQuery"
                  :autofocus="true"
                  :indent-with-tab="true"
                  :tab-size="2"
                  :extensions="extensions"
                  @ready="handleReady" />
              </div>
              <div v-if="errorMessage" class="error-box mb-2">
                {{ errorMessage }}
              </div>
              <div class="editor-footer flex items-center w-full mb-2">
                <ToggleButton
                  v-model="enableVisualization"
                  onLabel="Visualization On"
                  offLabel="Visualization Off">
                  <template #default>
                    <i :class="enableVisualization ? 'pi pi-eye' : 'pi pi-eye-slash'" />
                    Visualization
                  </template>
                </ToggleButton>
                <Button
                  icon="pi pi-info-circle"
                  variant="text"
                  severity="warning"
                  @click="visualizationHelpDialog = true" />
                <div class="flex items-center gap-2 ml-auto">
                  <Button
                    label="Run Query"
                    icon="pi pi-play"
                    @click="runQuery"
                    variant="text"
                    severity="secondary" />
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
                <li><code>?predicate</code> must always be a <b>Named Node (IRI)</b></li>
                <li><code>?subject</code> and <code>?object</code> may be IRIs or literals</li>
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
              v-model:filters="filters"
              filterDisplay="menu"
              scrollHeight="flex"
              :rows="50"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
              :rowsPerPageOptions="[10, 20, 50]"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords} results">
              <template v-if="columns.length > 0" #header>
                <div class="flex justify-end items-center w-full">
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
import {ref, shallowRef, computed, watch} from 'vue';
import {Codemirror} from 'vue-codemirror';
import {basicSetup} from 'codemirror';
import {sparql} from 'codemirror-lang-sparql';
import {syntaxHighlighting, HighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {oneDark} from '@codemirror/theme-one-dark';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {StateEffect, StateField} from '@codemirror/state';
import {EditorView, Decoration} from '@codemirror/view';
import {FilterMatchMode} from '@primevue/core/api';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import {isDarkMode} from '@/utility/darkModeUtils';
import Textarea from 'primevue/textarea';
import ToggleButton from 'primevue/togglebutton';
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

const isLoading = ref(false);
const userComments = ref('');
const result = ref('');
const statusMessage = ref('');

const statements = ref<$rdf.Statement[]>([]);
const visualizationHelpDialog = ref(false);
const addErrorLine = StateEffect.define<number | null>();
const clearErrorLines = StateEffect.define<null>();
const enableVisualization = ref(false);
const view = shallowRef();
const results = ref<Record<string, string>[]>([]);
const columns = ref<string[]>([]);
const errorMessage = ref<string | null>(null);
const filters = ref<Record<string, any>>({});
const activeTab = ref('query');
const errorLineMark = Decoration.line({
  attributes: {class: 'cm-error-line'},
});
const sparqlHighlightStyle = HighlightStyle.define([
  {tag: tags.keyword, color: '#c792ea', fontWeight: 'bold'},
  {tag: tags.variableName, color: '#82aaff'},
  {tag: tags.string, color: '#c3e88d'},
  {tag: tags.number, color: '#f78c6c'},
  {tag: tags.comment, color: '#5c6370', fontStyle: 'italic'},
  {tag: tags.operator, color: '#89ddff'},
  {tag: tags.punctuation, color: '#abb2bf'},
]);

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
    })
    .catch(error => {
      useErrorService().onError(error);
    })
    .finally(() => {
      isLoading.value = false;
    });
}

const priority = ['?subject', '?predicate', '?object'];

const errorLineField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    for (let effect of tr.effects) {
      if (effect.is(addErrorLine)) {
        const line = tr.state.doc.line(effect.value!);
        decorations = decorations.update({
          add: [errorLineMark.range(line.from)],
        });
      } else if (effect.is(clearErrorLines)) {
        decorations = Decoration.none;
      }
    }
    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
});

const visualizationQueryExample_1 = `
CONSTRUCT {
  ?subject ?predicate ?object .
}
`.trim();

const visualizationQueryExample_2 = `
CONSTRUCT {
  ?subject ?predicate ?object .
}
WHERE {
  ?s ?p ?o .

  BIND(?s AS ?subject)
  BIND(?p AS ?predicate)
  BIND(?o AS ?object)
}
`.trim();

const defaultQueryTemplate = `SELECT ?subject ?predicate ?object
WHERE
{
  ?subject ?predicate ?object .
}
`.trim();

const visualizationQueryTemplate = `CONSTRUCT {
  ?subject ?predicate ?object .
}
WHERE
{
  ?subject ?predicate ?object .
}
`.trim();

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

const highlightErrorLine = (lineNumber: number | null) => {
  if (!view.value) return;

  view.value.dispatch({
    effects: clearErrorLines.of(null),
  });

  if (lineNumber && lineNumber > 0) {
    view.value.dispatch({
      effects: addErrorLine.of(lineNumber),
    });
  }
};

const extensions = computed(() => [
  basicSetup,
  sparql(),
  syntaxHighlighting(sparqlHighlightStyle),
  errorLineField,
  ...(isDarkMode.value ? [oneDark] : []),
]);

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
  term?.termType === 'Literal' ? term.value : term?.value ?? (term ? String(term) : '');

const rdfjsToRdflib = (term: any) => {
  if (!term) return null;
  if (term.termType === 'NamedNode') return $rdf.sym(term.value);
  if (term.termType === 'BlankNode') return $rdf.blankNode(term.value);
  if (term.termType === 'Literal') {
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
  highlightErrorLine(null);

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
};

const runConstructQuery = async (engine: any, sources: any[]) => {
  const stmts: $rdf.Statement[] = [];
  const computedColumns = ['?subject', '?predicate', '?object'];

  const finalize = () => {
    const sorted = sortColumns(computedColumns);
    columns.value = sorted;
    initFilters(sorted);

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

      if (s && p && o && p.termType === 'NamedNode' && s.termType !== 'Literal') {
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
      highlightErrorLine(parseInt(lineMatch[1], 10));
    }
    if (err.location?.start?.line) {
      highlightErrorLine(err.location.start.line);
    }
    return false;
  }
};

const handleReady = (payload: {view: any}) => {
  view.value = payload.view;
};

const setEditorText = (text: string, applyPrefixes: boolean = true) => {
  sparqlQuery.value = applyPrefixes ? applyPrefixesToQuery(text) : text;
  if (!view.value) return;

  const state = view.value.state;
  view.value.dispatch({
    changes: {from: 0, to: state.doc.length, insert: sparqlQuery.value},
  });
};

watch(
  enableVisualization,
  on => {
    setEditorText(on ? visualizationQueryTemplate : defaultQueryTemplate);
  },
  {immediate: true}
);

let validateTimer: number | null = null;

const validateLive = () => {
  if (validateTimer) window.clearTimeout(validateTimer);

  validateTimer = window.setTimeout(() => {
    errorMessage.value = null;
    highlightErrorLine(null);

    try {
      const parser = new Parser();
      parser.parse(sparqlQuery.value);
    } catch (err: any) {
      errorMessage.value = err.message;
      const lineMatch = err.message?.match(/line[:\s]+(\d+)/i);
      if (lineMatch) highlightErrorLine(parseInt(lineMatch[1], 10));
      if (err.location?.start?.line) highlightErrorLine(err.location.start.line);
    }
  }, 250);
};

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

function openVisualizationHelpDialog() {
  visualizationHelpDialog.value = true;
}

function visualizationCanceled() {
  activeTab.value = 'query';
}
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
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

:deep(.cm-editor) {
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

:deep(.cm-scroller) {
  overflow: auto;
  height: 100%;
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

.error-box {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #ffe5e5;
  color: #d8000c;
  font-size: 0.875rem;
  border: 1px solid #d8000c;
  flex-shrink: 0;
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
}

:deep(.cm-error-line) {
  border-left: 3px solid #f44336;
}

:deep(.cm-error-line) {
  animation: errorPulse 0.5s ease-in-out;
}

:deep(.cm-frozen-line) {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.7;
}

:deep(.dark .cm-frozen-line) {
  background-color: #2a2a2a;
}

@keyframes errorPulse {
  0%,
  100% {
    background-color: #ffebee;
  }
  50% {
    background-color: #ffcdd2;
  }
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

.editor-container {
  flex: 1;
  min-height: 0;
}

.error-box,
.editor-footer {
  flex-shrink: 0;
}
</style>
