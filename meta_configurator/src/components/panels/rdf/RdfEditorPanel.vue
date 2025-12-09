<template>
  <div class="panel-tab-container">
    <Tabs value="graph">
      <TabList>
        <Tab value="context">Context</Tab>
        <Tab value="graph">Graph</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="context">
          <RdfEditorContextPanel
            :dataIsUnparsable="props.dataIsUnparsable"
            :dataIsInJsonLd="props.dataIsInJsonLd"
            @zoom_into_path="zoomIntoPath" />
        </TabPanel>
        <TabPanel value="graph">
          <RdfEditorGraphPanel
            :dataIsUnparsable="props.dataIsUnparsable"
            :dataIsInJsonLd="props.dataIsInJsonLd"
            @zoom_into_path="zoomIntoPath" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import RdfEditorGraphPanel from '@/components/panels/rdf/RdfEditorGraphPanel.vue';
import RdfEditorContextPanel from '@/components/panels/rdf/RdfEditorContextPanel.vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import type {Path} from '@/utility/path';

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

.p-tabpanels {
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
