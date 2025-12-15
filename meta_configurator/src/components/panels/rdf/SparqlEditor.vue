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
            <div class="editor-footer">
              <Button
                label="Run Query"
                icon="pi pi-play"
                @click="runQuery"
                variant="text"
                severity="secondary" />
            </div>
          </div>
        </TabPanel>
        <TabPanel value="result">
          <div class="datatable-wrapper">
            <DataTable
              v-if="results.length"
              size="small"
              :value="results"
              scrollable
              stripedRows
              scrollHeight="flex"
              :emptyMessage="'No results yet'">
              <Column v-for="col in columns" :key="col" :field="col" :header="col" />
            </DataTable>
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
import {syntaxHighlighting, defaultHighlightStyle} from '@codemirror/language';
import {oneDark} from '@codemirror/theme-one-dark';
import {isDarkMode} from '@/utility/darkModeUtils';
import Button from 'primevue/button';
import Tab from 'primevue/tab';
import Tabs from 'primevue/tabs';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import TabList from 'primevue/tablist';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import * as $rdf from 'rdflib';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {StateEffect, StateField} from '@codemirror/state';
import {EditorView, Decoration} from '@codemirror/view';

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

const activeTab = ref('query');
const sparqlQuery = ref(`SELECT *
WHERE
{
  ?s ?p ?o .
}`);

const extensions = [
  basicSetup,
  sparql(),
  syntaxHighlighting(defaultHighlightStyle),
  errorLineField,
  ...(isDarkMode.value ? [oneDark] : []),
];

const view = shallowRef();
const results = ref<Record<string, string>[]>([]);
const columns = ref<string[]>([]);
const errorMessage = ref<string | null>(null);

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

const runQuery = () => {
  results.value = [];
  columns.value = [];
  errorMessage.value = null;

  highlightErrorLine(null);

  try {
    const parser = new Parser();
    parser.parse(sparqlQuery.value);
    const queryObj = $rdf.SPARQLToQuery(sparqlQuery.value, false, rdfStoreManager.store.value);
    if (queryObj) {
      activeTab.value = 'result';
      rdfStoreManager.store.value.query(
        queryObj,
        result => {
          const mapped: Record<string, string> = {};
          for (const v in result) {
            mapped[v] = result[v]!.value;
          }
          results.value.push(mapped);
        },
        undefined,
        () => {
          if (results.value.length > 0) {
            columns.value = Object.keys(results.value[0]!);
          }
        }
      );
    }
  } catch (err: any) {
    errorMessage.value = err.message;
    const lineMatch = err.message.match(/line[:\s]+(\d+)/i);
    if (lineMatch) {
      const lineNumber = parseInt(lineMatch[1], 10);
      highlightErrorLine(lineNumber);
    }
    if (err.location && err.location.start && err.location.start.line) {
      highlightErrorLine(err.location.start.line);
    }
  }
};

const handleReady = (payload: {view: any}) => {
  view.value = payload.view;
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
  background-color: #ffebee;
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
