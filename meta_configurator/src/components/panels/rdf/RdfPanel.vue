<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <PanelSettings panel-name="RDF View" :panel-settings-path="['rdf']">
    <div v-if="dataIsInJsonLd">
      <p class="text-gray-600 text-sm mt-1">Your data is in JSON-LD format.</p>
    </div>
    <div v-else class="border border-yellow-400 bg-yellow-50 text-yellow-800 p-3 rounded mt-2">
      To use RDF panel, your data should be in JSON-LD format. You can use
      <a href="#" @click.prevent="showRmlMappingDialog" class="text-blue-600 hover:underline">
        JSON to JSON-LD
      </a>
      utility to convert it to JSON-LD.
    </div>
  </PanelSettings>
  <RmlMappingDialog ref="rmlMappingDialog" />
  <RdfEditorPanel :sessionMode="props.sessionMode" />
</template>

<script setup lang="ts">
import {getDataForMode} from '@/data/useDataLink';
import {ref, watch} from 'vue';
import RdfEditorPanel from '@/components/panels/rdf/RdfEditorPanel.vue';
import {SessionMode} from '@/store/sessionMode';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import RmlMappingDialog from '@/components/toolbar/dialogs/rml-mapping/RmlMappingDialog.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const rmlMappingDialog = ref();

const dataIsInJsonLd = ref(false);

watch(
  () => getDataForMode(props.sessionMode).data.value,
  async dataValue => {
    try {
      dataIsInJsonLd.value = isJsonLD(JSON.stringify(dataValue));
    } catch (err) {
      dataIsInJsonLd.value = false;
    }
  },
  {immediate: true}
);

function isJsonLD(inputData: string): boolean {
  try {
    const data = JSON.parse(inputData);
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    if (!data['@context']) {
      return false;
    }
    console.log('Data is valid JSON-LD');
    return true;
  } catch (error) {
    console.log('Data is not valid JSON-LD');
    return false;
  }
}

function showRmlMappingDialog() {
  rmlMappingDialog.value?.show();
}
</script>
