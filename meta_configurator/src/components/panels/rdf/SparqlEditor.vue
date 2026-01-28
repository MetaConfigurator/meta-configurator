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
            <div class="editor-container">
              <codemirror
                v-model="sparqlQuery"
                :autofocus="true"
                :indent-with-tab="true"
                :tab-size="2"
                :extensions="extensions"
                @ready="handleReady" />
            </div>
            <div v-if="errorMessage" class="error-box">
              {{ errorMessage }}
            </div>
            <div class="editor-footer flex items-center w-full">
              <Button
                icon="pi pi-exclamation-triangle"
                label="SPARQL limitations"
                variant="text"
                severity="warning"
                @click="limitationsHelpDialog = true" />
              <div class="flex items-center gap-2 ml-auto">
                <Button
                  icon="pi pi-info-circle"
                  variant="text"
                  severity="warning"
                  @click="visualizationHelpDialog = true" />
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
                  label="Run Query"
                  icon="pi pi-play"
                  @click="runQuery"
                  variant="text"
                  severity="secondary" />
              </div>
            </div>
          </div>
          <Dialog
            v-model:visible="visualizationHelpDialog"
            header="Visualization Notes"
            modal
            style="width: 500px">
            <div class="text-sm leading-relaxed">
              <p class="mb-2">
                To enable <b>Visualization</b>, your query must return RDF triples in a form that
                can be converted into <b>rdflib.js Statements</b>.
              </p>
              <p class="font-semibold mb-1">Required query structure:</p>
              <ul class="pl-4 list-disc mb-3">
                <li>The query must be a <b>SELECT</b> query</li>
                <li>
                  The result must include <b>exactly these variables</b>: <code>?subject</code>,
                  <code>?predicate</code>, <code>?object</code>
                </li>
                <li>
                  <code>?predicate</code> must always refer to a <b>Named Node (IRI)</b>
                  — literals or variables bound to literals are not supported
                </li>
                <li><code>?subject</code> and <code>?object</code> may be IRIs or literals</li>
              </ul>
              <p class="font-semibold mb-1">Example (recommended):</p>
              <pre
                :class="[
                  'p-2 rounded text-xs overflow-auto !bg-gray-100',
                  isDarkMode && '!bg-gray-900',
                ]"
                >{{ visualizationQueryExample_1 }}
  </pre
              >
              <p class="font-semibold mb-1">Filtering to a specific subject:</p>
              <pre
                :class="[
                  'p-2 rounded text-xs overflow-auto !bg-gray-100',
                  isDarkMode && '!bg-gray-900',
                ]"
                >{{ visualizationQueryExample_2 }}
  </pre
              >
              <Message severity="warn">
                Visualization will be disabled if the query does not return
                <code>?subject</code>, <code>?predicate</code>, and <code>?object</code>, or if
                <code>?predicate</code> is not a Named Node.
              </Message>
            </div>
          </Dialog>
          <Dialog
            v-model:visible="limitationsHelpDialog"
            header="Unsupported SPARQL Features"
            modal
            style="width: 500px">
            <div class="text-sm leading-relaxed">
              <p class="mb-2">
                This SPARQL editor uses <b>rdflib.js</b> and supports only a
                <b>very limited subset</b> of SPARQL. It is <b>not a full SPARQL 1.1 engine</b>.
              </p>
              <p class="font-semibold mb-1">The following features are <b>not supported</b>:</p>
              <ul class="pl-4 list-disc mb-3">
                <li>
                  <b>CONSTRUCT</b>, <b>ASK</b>, <b>DESCRIBE</b> query forms (only <b>SELECT</b> is
                  supported)
                </li>
                <li><b>LIMIT</b>, <b>OFFSET</b>, <b>ORDER BY</b>, <b>DISTINCT</b></li>
                <li>Aggregates: <b>COUNT</b>, <b>SUM</b>, <b>AVG</b>, <b>MIN</b>, <b>MAX</b></li>
                <li><b>GROUP BY</b>, <b>HAVING</b></li>
                <li><b>Subqueries</b></li>
                <li><b>UNION</b></li>
                <li>
                  Property paths (<code>/</code>, <code>*</code>, <code>+</code>, <code>?</code>,
                  <code>|</code>, <code>^</code>)
                </li>
                <li><b>VALUES</b></li>
                <li><b>BIND</b></li>
                <li>
                  Advanced <b>FILTER</b> expressions (AND, OR, IN, arithmetic, functions like STR(),
                  LANG(), DATATYPE(), etc.)
                </li>
                <li><b>SPARQL UPDATE</b> (INSERT, DELETE, LOAD, CLEAR, etc.)</li>
                <li><b>SERVICE</b> (federated queries)</li>
              </ul>
              <p class="font-semibold mb-1">Partially supported features:</p>
              <ul class="pl-4 list-disc mb-3">
                <li>
                  <b>FILTER</b> only supports simple equality comparisons and basic
                  <code>REGEXP</code>
                </li>
                <li><b>OPTIONAL</b> blocks are parsed but may not behave correctly in all cases</li>
              </ul>
              <Message severity="warn">
                Queries using unsupported features may fail to parse or produce incorrect or
                unexpected results. For best results, use simple <b>SELECT</b> queries with basic
                triple patterns.
              </Message>
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
            <Message v-else severity="warn">
              No results. Please check your query and
              <a
                href="#"
                @click.prevent="openLimitationsHelpDialog"
                class="text-blue-600 hover:underline">
                limitations </a
              >.
            </Message>
          </div>
        </TabPanel>
        <TabPanel value="visualizer">
          <RdfVisualizer
            v-if="results.length"
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
import {Parser} from 'sparqljs';
import {ref, shallowRef, computed, watch} from 'vue';
import {Codemirror} from 'vue-codemirror';
import {basicSetup} from 'codemirror';
import {sparql} from 'codemirror-lang-sparql';
import {syntaxHighlighting, HighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {oneDark} from '@codemirror/theme-one-dark';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {StateEffect, StateField, EditorState} from '@codemirror/state';
import {EditorView, Decoration} from '@codemirror/view';
import {FilterMatchMode} from '@primevue/core/api';
import {isDarkMode} from '@/utility/darkModeUtils';
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
import * as $rdf from 'rdflib';
import RdfVisualizer from '@/components/panels/rdf/RdfVisualizer.vue';

const statements = ref<$rdf.Statement[]>([]);
const limitationsHelpDialog = ref(false);
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
SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
}
`.trim();

const visualizationQueryExample_2 = `
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
  FILTER(?subject = foaf:Person)
}
`.trim();

const defaultQueryTemplate = `SELECT ?subject ?predicate ?object
WHERE
{
  ?subject ?predicate ?object .
}
`.trim();

const graphQueryTemplate = `CONSTRUCT {
  ?subject ?predicate ?object .
}
WHERE
{
  ?subject ?predicate ?object .
}
`.trim();

const buildPrefixBlock = (namespaces: Record<string, string>): string => {
  return Object.entries(namespaces)
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

const runQuery = () => {
  results.value = [];
  columns.value = [];
  statements.value = [];
  errorMessage.value = null;
  highlightErrorLine(null);

  if (!validateSparqlSyntax()) return;

  rdfStoreManager.query(
    sparqlQuery.value,
    row => {
      results.value.push(row);
    },
    cols => {
      const sortedCols = [
        ...priority.filter(c => cols.includes(c)),
        ...cols.filter(c => !priority.includes(c)),
      ];
      columns.value = sortedCols;
      initFilters(sortedCols);
      activeTab.value = enableVisualization.value ? 'visualizer' : 'result';
    },
    enableVisualization.value
      ? stmts => {
          statements.value = stmts;
        }
      : undefined
  );
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

const setEditorText = (text: string) => {
  sparqlQuery.value = applyPrefixesToQuery(text);
  if (!view.value) return;

  const state = view.value.state;
  view.value.dispatch({
    changes: {from: 0, to: state.doc.length, insert: sparqlQuery.value},
  });
};

watch(enableVisualization, on => {
  setEditorText(on ? graphQueryTemplate : defaultQueryTemplate);
});

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

watch(sparqlQuery, () => {
  validateLive();
});

function openLimitationsHelpDialog() {
  limitationsHelpDialog.value = true;
}

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
</style>
