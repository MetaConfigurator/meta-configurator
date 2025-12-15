<template>
  <div class="sparql-editor-wrapper">
    <Tabs value="query">
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

const sparqlQuery = ref(`SELECT *
WHERE
{
  ?s ?p ?o .
}`);

const extensions = [
  basicSetup,
  sparql(),
  syntaxHighlighting(defaultHighlightStyle),
  ...(isDarkMode.value ? [oneDark] : []),
];

const view = shallowRef();
const results = ref<Record<string, string>[]>([]);
const columns = ref<string[]>([]);

const runQuery = () => {
  results.value = [];
  columns.value = [];

  const queryObj = $rdf.SPARQLToQuery(sparqlQuery.value, false, rdfStoreManager.store.value);

  if (queryObj) {
    rdfStoreManager.store.value.query(
      queryObj,
      result => {
        const mapped: Record<string, string> = {};
        for (const v in result) {
          mapped[v] = result[v].value;
        }
        results.value.push(mapped);
      },
      undefined,
      () => {
        if (results.value.length > 0) {
          columns.value = Object.keys(results.value[0]);
        }
      }
    );
  }
};

const handleReady = payload => {
  view.value = payload.view;
  console.log('CodeMirror EditorView instance:', view.value);
};
</script>

<style scoped>
.sparql-editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Make tabs fill the container */
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
  min-height: 0; /* Important for flex child */
}

/* Make CodeMirror fill the container */
:deep(.cm-editor) {
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

:deep(.cm-scroller) {
  overflow: auto;
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
</style>
