<template>
  <div class="properties-panel-wrapper">
    <div class="properties-content">
      <Transition name="fade">
        <ProgressSpinner v-if="isRefreshingNode" class="properties-loading-overlay" />
      </Transition>
      <div class="properties-body">
        <div class="node-cards">
          <Card class="prop-card" v-if="selectedNode" :key="`node-${selectedNode.id}`">
            <template #title>
              <div class="card-title">
                <i class="pi pi-globe" />
                <span>Node Identifier</span>
              </div>
            </template>
            <template #content>
              <div class="kv-row kv-row-inline">
                <span class="kv-row-text">
                  <a
                    v-if="isIRI(selectedNode.id)"
                    class="kv-value link"
                    :href="selectedNode.id"
                    target="_blank"
                    rel="noopener noreferrer">
                    {{ selectedNode.id }}
                  </a>
                  <span v-else class="kv-value">
                    {{ selectedNode.id }}
                  </span>
                </span>
                <Divider
                  v-if="!readOnly"
                  layout="vertical"
                  class="action-divider action-divider-right" />
                <Button
                  v-if="!readOnly"
                  class="delete-node-btn"
                  icon="pi pi-times-circle"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  v-tooltip.bottom="'Delete node'"
                  @click="emit('delete-node')" />
              </div>
            </template>
          </Card>
          <Card class="prop-card" v-else>
            <template #title>
              <div class="card-title">
                <i class="pi pi-globe" />
                <span>Node Identifier</span>
              </div>
            </template>
            <template #content>
              <div class="card-empty">
                <i class="pi pi-share-alt empty-icon" />
                <p>Select a node to see its identifier</p>
              </div>
            </template>
          </Card>

          <Card
            class="prop-card"
            v-if="selectedNode"
            :key="`props-${selectedNode.id}-${propertyUpdateKey}`">
            <template #title>
              <div class="card-title">
                <i class="pi pi-list" />
                <span>
                  Properties
                  <span v-if="selectedNode?.literals?.length">
                    ({{ selectedNode.literals.length }})
                  </span>
                </span>
                <Button
                  v-if="!readOnly"
                  class="ml-auto prop-action-btn"
                  icon="pi pi-plus-circle"
                  text
                  rounded
                  size="small"
                  v-tooltip.bottom="'Add property'"
                  @click="emit('add-property')" />
              </div>
            </template>
            <template #content>
              <div v-if="!selectedNode.literals?.length" class="card-empty">
                <i class="pi pi-inbox empty-icon" />
                <p>No properties found for this node</p>
              </div>
              <div v-else class="props-list">
                <TransitionGroup name="property-list" tag="div">
                  <div
                    class="prop-line"
                    v-for="(lit, idx) in selectedNode.literals"
                    :key="`${lit.predicate}-${lit.value}-${idx}`">
                    <span class="prop-text-group">
                      <a
                        class="kv-value link"
                        :href="iriHref(lit.predicate) || lit.predicate"
                        target="_blank"
                        rel="noopener noreferrer">
                        {{ lit.predicate }}
                      </a>
                      <span class="prop-text">:</span>
                      <a
                        v-if="lit.isIRI && (lit.href || isLinkableIRI(lit.value))"
                        class="prop-text link"
                        :href="lit.href || iriHref(lit.value) || undefined"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click="emit('property-link-click', lit, $event)">
                        {{ lit.value }}
                      </a>
                      <span v-else class="prop-text">
                        {{ lit.value }}
                      </span>
                    </span>
                    <Divider
                      v-if="!readOnly"
                      layout="vertical"
                      class="action-divider action-divider-right" />
                    <div v-if="!readOnly" class="prop-actions">
                      <Button
                        class="prop-action-btn"
                        icon="pi pi-pencil"
                        text
                        rounded
                        size="small"
                        v-tooltip.bottom="'Edit property'"
                        @click="emit('edit-property', lit)" />
                      <Button
                        class="prop-action-btn"
                        icon="pi pi-times-circle"
                        text
                        rounded
                        size="small"
                        severity="danger"
                        v-tooltip.bottom="'Delete property'"
                        @click="emit('delete-property', lit)" />
                    </div>
                  </div>
                </TransitionGroup>
              </div>
            </template>
          </Card>
          <Card class="prop-card" v-else>
            <template #title>
              <div class="card-title">
                <i class="pi pi-list" />
                <span>Properties</span>
              </div>
            </template>
            <template #content>
              <div class="card-empty">
                <i class="pi pi-info-circle empty-icon" />
                <p>Select a node to view its properties</p>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type * as $rdf from 'rdflib';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import Divider from 'primevue/divider';
import Button from 'primevue/button';

interface SelectedNodeData {
  id: string;
  label: string;
  literals?: Array<{
    predicate: string;
    value: string;
    isIRI: boolean;
    href?: string;
    statement?: $rdf.Statement;
  }>;
}

defineProps<{
  selectedNode: SelectedNodeData | null;
  readOnly: boolean;
  isRefreshingNode: boolean;
  propertyUpdateKey: number;
  iriHref: (value: string) => string | null;
  isIRI: (value: string) => boolean;
  isLinkableIRI: (value: string) => boolean;
}>();

const emit = defineEmits<{
  (e: 'delete-node'): void;
  (e: 'delete-property', lit: SelectedNodeData['literals'][number]): void;
  (e: 'edit-property', lit: SelectedNodeData['literals'][number]): void;
  (e: 'add-property'): void;
  (e: 'property-link-click', lit: SelectedNodeData['literals'][number], event: MouseEvent): void;
}>();
</script>

<style scoped>
.properties-panel-wrapper {
  display: flex;
  flex-direction: column;
  background: white;
  border-left: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.properties-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.properties-loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
}

.properties-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.node-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.prop-card :deep(.p-card) {
  border-radius: 12px;
}

.prop-card :deep(.p-card-title) {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 13px;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kv-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
  word-break: break-word;
  width: 100%;
}

.kv-row-inline {
  align-items: center;
}

.kv-row-text {
  min-width: 0;
}

.delete-node-btn {
  flex-shrink: 0;
}

.action-divider {
  flex-shrink: 0;
  height: 14px;
  opacity: 0;
}

.action-divider :deep(.p-divider-content) {
  display: none;
}

.kv-row:last-child {
  border-bottom: none;
}

.kv-value,
.prop-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.35;
  word-break: break-word;
}

.props-list .prop-text:first-of-type {
  margin: 0 4px;
}

.props-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prop-actions {
  display: inline-flex;
  align-items: center;
  gap: 0px;
  flex-shrink: 0;
}

.prop-action-btn {
  flex-shrink: 0;
}

.prop-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 3px 0;
  word-break: break-word;
  width: 100%;
}

.prop-text-group {
  min-width: 0;
}

.action-divider-right {
  margin-left: auto;
}

.link {
  color: #2563eb;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.card-empty {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 24px;
}

.card-empty p {
  font-size: 13px;
  margin: 0;
}

.property-list-enter-active,
.property-list-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.property-list-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}

.property-list-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.property-list-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-color-scheme: dark) {
  .properties-panel-wrapper {
    background: #1a202c;
    border-left-color: #4a5568;
  }

  .card-title {
    color: #e2e8f0;
  }

  .kv-value,
  .prop-text {
    color: #cbd5e0;
  }

  .kv-row {
    border-bottom-color: #4a5568;
  }

  .link {
    color: #a5b4fc;
  }

  .card-empty {
    color: #64748b;
  }
}
</style>
