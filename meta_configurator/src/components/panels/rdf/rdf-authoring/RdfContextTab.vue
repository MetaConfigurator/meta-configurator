<script setup lang="ts">
import PropertiesPanel from '@/components/panels/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/utility/path';
import {computed, toRaw} from 'vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {defaultJsonLdSchema} from '@/components/panels/rdf/rdfUtils';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';

const props = defineProps<{
  sessionMode: SessionMode;
  dataIsUnparsable: boolean;
  dataIsInJsonLd: boolean;
}>();

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);

const currentSchema = computed(() => {
  return new JsonSchemaWrapper(structuredClone(defaultJsonLdSchema), props.sessionMode, true);
});

const parsingErrors = computed(() => {
  return rdfStoreManager.parseErrors.value.map((msg, index) => ({
    id: index,
    message: msg,
  }));
});

function updateData(path: Path, newValue: any) {
  data.setDataAt(path, newValue);
}

function removeProperty(path: Path) {
  data.removeDataAt(path);
  session.updateCurrentSelectedElement(path);
}

function selectPath(path: Path) {
  session.updateCurrentSelectedElement(path);
}

const currentData = computed(() => {
  const contextData = data.dataAt(['@context']);
  return contextData === undefined ? undefined : structuredClone(toRaw(contextData));
});
</script>

<template>
  <div
    :class="[
      'p-5 space-y-3 flex flex-col',
      {'disabled-wrapper': !dataIsInJsonLd || dataIsUnparsable || parsingErrors.length > 0},
    ]">
    <div v-if="dataIsInJsonLd && !dataIsUnparsable">
      <div class="flex-grow overflow-y-scroll">
        <PropertiesPanel
          :currentSchema="currentSchema"
          :currentPath="['@context']"
          :currentData="currentData"
          :sessionMode="props.sessionMode"
          :table-header="undefined"
          @remove_property="removeProperty"
          @select_path="selectedPath => selectPath(selectedPath)"
          @update_data="updateData" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.disabled-wrapper {
  position: relative;
}

.disabled-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  cursor: not-allowed;
  pointer-events: auto;
}

.disabled-wrapper > * {
  pointer-events: none;
  opacity: 0.5;
}
</style>
