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
          <SparqlQueryTab
            :activeAccordion="activeAccordion"
            :userComments="userComments"
            :userCommentsPlaceholder="USER_COMMENTS_PLACEHOLDER"
            :isSuggesting="isLoading"
            :sparqlQuery="sparqlQuery"
            :errorLineNumber="errorLineNumber"
            :errorMessage="errorMessage"
            :enableVisualization="enableVisualization"
            :visualizationHelpDialog="visualizationHelpDialog"
            @update:activeAccordion="activeAccordion = $event"
            @update:userComments="userComments = $event"
            @update:sparqlQuery="sparqlQuery = $event"
            @update:enableVisualization="enableVisualization = $event"
            @update:visualizationHelpDialog="visualizationHelpDialog = $event"
            @suggest="suggestSparqlQuery"
            @run-query="runQuery"
            @open-visualization-help="openVisualizationHelpDialog" />
        </TabPanel>

        <TabPanel value="result">
          <SparqlResultTab
            :results="results"
            :columns="columns"
            :filters="filters"
            :exportMenuItems="exportMenuItems"
            @update:filters="filters = $event"
            @clear-filters="clearFilters" />
        </TabPanel>

        <TabPanel value="visualizer">
          <SparqlVisualizerTab
            :statements="statements"
            @cancel-render="visualizationCanceled"
            @open-help="openVisualizationHelpDialog" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue';
import {FilterMatchMode} from '@primevue/core/api';
import Tab from 'primevue/tab';
import Tabs from 'primevue/tabs';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import TabList from 'primevue/tablist';
import type * as $rdf from 'rdflib';
import SparqlQueryTab from '@/components/panels/rdf/sparql-editor/SparqlQueryTab.vue';
import SparqlResultTab from '@/components/panels/rdf/sparql-editor/SparqlResultTab.vue';
import SparqlVisualizerTab from '@/components/panels/rdf/sparql-editor/SparqlVisualizerTab.vue';
import {
  useSparqlAiAssistant,
  USER_COMMENTS_PLACEHOLDER,
} from '@/components/panels/rdf/sparql-editor/useSparqlAiAssistant';
import {
  QueryResultMode,
  useSparqlRunner,
} from '@/components/panels/rdf/sparql-editor/useSparqlRunner';
import {useSparqlExport} from '@/components/panels/rdf/sparql-editor/useSparqlExport';

const queryMode = ref<QueryResultMode>(QueryResultMode.SELECT);
const isLoading = ref(false);
const userComments = ref('');
const activeAccordion = ref<string | null>(null);
const statements = ref<$rdf.Statement[]>([]);
const visualizationHelpDialog = ref(false);
const enableResult = ref(false);
const enableVisualization = ref(false);
const results = ref<Record<string, string>[]>([]);
const columns = ref<string[]>([]);
const errorMessage = ref<string | null>(null);
const errorLineNumber = ref<number | null>(null);
const filters = ref<Record<string, any>>({});
const activeTab = ref('query');
const sparqlQuery = ref('');
const priority = ['?subject', '?predicate', '?object'];

const clearFilters = () => {
  Object.values(filters.value).forEach(filter => {
    if (filter && typeof filter === 'object' && 'value' in filter) {
      filter.value = null;
    }
  });
};

const initFilters = (cols: string[]) => {
  const nextFilters: Record<string, any> = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
  };

  cols.forEach(col => {
    nextFilters[col] = {value: null, matchMode: FilterMatchMode.CONTAINS};
  });

  filters.value = nextFilters;
};

const sortColumns = (cols: string[]) => [
  ...priority.filter(c => cols.includes(c)),
  ...cols.filter(c => !priority.includes(c)),
];

const {setEditorText, initializeEditorQuery, onVisualizationToggleChanged, validateLive, runQuery} =
  useSparqlRunner({
    enableVisualization,
    enableResult,
    sparqlQuery,
    results,
    columns,
    statements,
    errorMessage,
    errorLineNumber,
    activeTab,
    queryMode,
    sortColumns,
    initFilters,
  });

const {suggestSparqlQuery} = useSparqlAiAssistant({
  isLoading,
  userComments,
  enableVisualization,
  setEditorText,
  closeAiAccordion: () => {
    activeAccordion.value = null;
  },
});

const {exportMenuItems} = useSparqlExport({
  queryMode,
  results,
  columns,
  statements,
});

watch(
  enableVisualization,
  on => {
    onVisualizationToggleChanged(on);
  },
  {immediate: true}
);

watch(sparqlQuery, () => {
  validateLive();
});

initializeEditorQuery();

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
</style>
