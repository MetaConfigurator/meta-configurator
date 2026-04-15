<template>
  <ScrollPanel class="properties-scroll" :class="{'properties-frozen': hasGraphError}">
    <div class="properties-search-bar">
      <div class="properties-search-input">
        <AutoComplete
          :modelValue="nodeSearchQuery"
          @update:modelValue="emit('update:nodeSearchQuery', $event)"
          :suggestions="nodeSearchResults"
          optionLabel="label"
          placeholder="Search nodes..."
          :disabled="hasGraphError"
          :forceSelection="false"
          :autoHighlight="true"
          @complete="emit('node-search-complete', $event)"
          @item-select="emit('select-node-by-id', $event.value.id)">
          <template #option="slotProps">
            <div class="result-option">
              <span class="result-label">{{ slotProps.option.label }}</span>
              <span class="result-id">{{ slotProps.option.id }}</span>
            </div>
          </template>
        </AutoComplete>
        <Button
          v-if="nodeSearchQuery"
          class="search-clear-btn"
          icon="pi pi-times"
          text
          rounded
          size="small"
          :disabled="hasGraphError"
          @click="emit('clear-node-search')" />
      </div>
    </div>
    <RdfVisualizerPropertiesView
      class="properties-view"
      :selectedNode="selectedNode"
      :readOnly="readOnly"
      :isRefreshingNode="isRefreshingNode"
      :propertyUpdateKey="propertyUpdateKey"
      :iriHref="iriHref"
      :isIRI="isIRI"
      :isLinkableIRI="isLinkableIRI"
      @edit-node="emit('edit-node')"
      @delete-node="emit('delete-node')"
      @delete-property="emit('delete-property', $event)"
      @edit-property="emit('edit-property', $event)"
      @add-property="emit('add-property')"
      @add-node="emit('add-node')"
      @property-link-click="onPropertyLinkClick" />
  </ScrollPanel>
</template>

<script setup lang="ts">
import ScrollPanel from 'primevue/scrollpanel';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import RdfVisualizerPropertiesView from '@/components/panels/rdf/visualizer/RdfVisualizerPropertiesView.vue';
import type {RdfNodeLiteral, SelectedNodeData} from '@/components/panels/rdf/rdfUtils';

defineProps<{
  hasGraphError: boolean;
  nodeSearchQuery: {id: string; label: string} | string | null;
  nodeSearchResults: Array<{id: string; label: string}>;
  selectedNode: SelectedNodeData | null;
  readOnly: boolean;
  isRefreshingNode: boolean;
  propertyUpdateKey: number;
  iriHref: (value: string) => string | null;
  isIRI: (value: string) => boolean;
  isLinkableIRI: (value: string) => boolean;
}>();

const emit = defineEmits<{
  (e: 'update:nodeSearchQuery', value: {id: string; label: string} | string | null): void;
  (e: 'node-search-complete', event: {query: string}): void;
  (e: 'select-node-by-id', nodeId: string): void;
  (e: 'clear-node-search'): void;
  (e: 'edit-node'): void;
  (e: 'delete-node'): void;
  (e: 'delete-property', lit: RdfNodeLiteral): void;
  (e: 'edit-property', lit: RdfNodeLiteral): void;
  (e: 'add-property'): void;
  (e: 'add-node'): void;
  (e: 'property-link-click', lit: RdfNodeLiteral, event: MouseEvent): void;
}>();

function onPropertyLinkClick(lit: RdfNodeLiteral, event: MouseEvent) {
  emit('property-link-click', lit, event);
}
</script>

<style scoped>
.properties-search-bar {
  padding: 10px 12px;
  background: var(--p-surface-card);
}

.properties-search-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.properties-search-input :deep(.p-autocomplete) {
  width: 100%;
  flex: 1;
}

.properties-search-input :deep(.p-autocomplete-input) {
  width: 100%;
  font-size: 13px;
}

.search-clear-btn {
  margin-left: auto;
}

.result-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 2px;
}

.result-label {
  font-size: 12px;
  color: var(--p-text-color);
  word-break: break-word;
}

.result-id {
  font-size: 11px;
  color: var(--p-text-muted-color);
  word-break: break-word;
}

.properties-scroll {
  width: 100%;
  height: 100%;
}

.properties-frozen {
  pointer-events: none;
  opacity: 0.6;
  filter: grayscale(0.2);
}

.properties-scroll :deep(.p-scrollpanel-content) {
  display: flex;
  flex-direction: column;
}

.properties-view {
  flex: 1;
  min-height: 0;
}
</style>
