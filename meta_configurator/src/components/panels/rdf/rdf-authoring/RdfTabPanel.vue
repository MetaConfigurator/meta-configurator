<template>
  <div class="panel-tab-container">
    <Tabs value="triple">
      <TabList>
        <Tab value="context">Context</Tab>
        <Tab value="triple">Triples</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="context">
          <div class="panel-content">
            <ScrollPanel
              class="context-scroll"
              :dt="{
                bar: {
                  background: '{primary.color}',
                },
              }">
              <RdfContextTab
                :sessionMode="SessionMode.DataEditor"
                :dataIsUnparsable="props.dataIsUnparsable"
                :dataIsInJsonLd="props.dataIsInJsonLd" />
            </ScrollPanel>
          </div>
        </TabPanel>
        <TabPanel value="triple">
          <RdfTripleTab
            :dataIsUnparsable="props.dataIsUnparsable"
            :dataIsInJsonLd="props.dataIsInJsonLd"
            @zoom_into_path="zoomIntoPath" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import RdfTripleTab from '@/components/panels/rdf/rdf-authoring/RdfTripleTab.vue';
import RdfContextTab from '@/components/panels/rdf/rdf-authoring/RdfContextTab.vue';
import ScrollPanel from 'primevue/scrollpanel';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import type {Path} from '@/utility/path';
import {SessionMode} from '@/store/sessionMode';

const props = defineProps<{
  dataIsUnparsable: boolean;
  dataIsInJsonLd: boolean;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path: Path): void;
}>();

function zoomIntoPath(path: Path) {
  emit('zoom_into_path', path);
}
</script>

<style scoped>
.panel-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.context-scroll {
  width: 100%;
  height: 100%;
}

.panel-tab-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

:deep(.p-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

:deep(.p-tablist) {
  flex-shrink: 0;
}

:deep(.p-tabpanels) {
  padding: 0;
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

:deep(.p-tabpanel) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

:deep(.p-datatable) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.p-datatable-wrapper) {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
