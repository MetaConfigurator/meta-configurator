<template>
  <div class="sparql-editor-wrapper">
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="query">Query</Tab>
        <Tab value="result">Result</Tab>
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
            <div
              class="editor-footer flex items-center"
              style="width: 100%; justify-content: space-between">
              <Button
                icon="pi pi-info-circle"
                label="SPARQL limitations"
                variant="text"
                severity="warning"
                @click="limitationsDialog = true" />
              <Button
                label="Run Query"
                icon="pi pi-play"
                @click="runQuery"
                variant="text"
                severity="secondary" />
            </div>
          </div>
          <Dialog
            v-model:visible="limitationsDialog"
            header="Unsupported SPARQL Features"
            modal
            style="width: 500px">
            <div class="text-sm leading-relaxed">
              <p class="mb-2">
                This SPARQL editor uses <b>rdflib.js</b> and supports only a subset of SPARQL 1.1.
              </p>
              <p class="font-semibold mb-1">The following features are not supported:</p>
              <ul class="pl-4 list-disc mb-3">
                <li><b>LIMIT</b>, <b>OFFSET</b>, <b>ORDER BY</b>, <b>DISTINCT</b></li>
                <li>Aggregates: COUNT, SUM, AVG, MIN, MAX</li>
                <li>GROUP BY, HAVING</li>
                <li>Subqueries</li>
                <li>Property paths (/, *, +, ?, |, ^)</li>
                <li>VALUES</li>
                <li>SPARQL UPDATE (INSERT, DELETE, etc.)</li>
                <li>SERVICE (federated queries)</li>
              </ul>
              <Message severity="warn">
                Queries using these features may execute but return incorrect or unexpected results.
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
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords} results"
              :emptyMessage="'No results yet'">
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
                @click.prevent="openLimitationsDialog"
                class="text-blue-600 hover:underline">
                limitations </a
              >.
            </Message>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import {Parser} from 'sparqljs';
import {ref, shallowRef} from 'vue';
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
import {isDarkMode} from '@/utility/darkModeUtils';
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

const limitationsDialog = ref(false);
const addErrorLine = StateEffect.define<number | null>();
const clearErrorLines = StateEffect.define<null>();
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
const errorLineMark = Decoration.line({
  attributes: {class: 'cm-error-line'},
});
const filters = ref<Record<string, any>>({});
const activeTab = ref('query');
const sparqlHighlightStyle = HighlightStyle.define([
  {tag: tags.keyword, color: '#c792ea', fontWeight: 'bold'},
  {tag: tags.variableName, color: '#82aaff'},
  {tag: tags.string, color: '#c3e88d'},
  {tag: tags.number, color: '#f78c6c'},
  {tag: tags.comment, color: '#5c6370', fontStyle: 'italic'},
  {tag: tags.operator, color: '#89ddff'},
  {tag: tags.punctuation, color: '#abb2bf'},
]);
const extensions = [
  basicSetup,
  sparql(),
  syntaxHighlighting(sparqlHighlightStyle),
  errorLineField,
  ...(isDarkMode.value ? [oneDark] : []),
];
const view = shallowRef();
const results = ref<Record<string, string>[]>([]);
const columns = ref<string[]>([]);
const errorMessage = ref<string | null>(null);
const sparqlQuery = ref(`SELECT *
WHERE
{
  ?s ?p ?o .
}`);

const highlightErrorLine = (lineNumber: number | null) => {
  if (!view.value) return;

  view.value.dispatch({
    effects: clearErrorLines.of(null),
  });

  if (lineNumber && lineNumber > 0) {
    view.value.dispatch({
      effects: addErrorLine.of(lineNumber),
    });

    const line = view.value.state.doc.line(lineNumber);
    view.value.dispatch({
      selection: {anchor: line.from},
      scrollIntoView: true,
    });
  }
};

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
  errorMessage.value = null;
  highlightErrorLine(null);
  if (!validateSparqlSyntax()) {
    return;
  }
  rdfStoreManager.query(
    sparqlQuery.value,
    row => {
      results.value.push(row);
    },
    cols => {
      columns.value = cols;
      initFilters(cols);
      activeTab.value = 'result';
    }
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

function openLimitationsDialog() {
  limitationsDialog.value = true;
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
