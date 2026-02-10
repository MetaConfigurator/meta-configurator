<template>
  <div style="width: 100%; height: 100%; display: flex; position: relative">
    <Dialog
      v-model:visible="showLargeGraphPrompt"
      header="Large graph detected"
      modal
      :closable="false">
      <Message severity="warn" :closable="false">
        <template #default>
          This graph contains <strong>{{ nodeCount }}</strong> nodes. Rendering may be slow for
          graphs with more than <strong>{{ settings.rdf.maximumNodesToVisualize }}</strong> nodes.
          <br />
          Do you want to continue?
        </template>
      </Message>
      <template #footer>
        <Button
          label="No"
          icon="pi pi-times"
          text
          severity="secondary"
          @click="confirmRender(false)" />
        <Button
          label="Yes"
          icon="pi pi-check"
          text
          severity="danger"
          @click="confirmRender(true)" />
      </template>
    </Dialog>
    <div style="width: 100%; height: 100%; display: flex; position: relative">
      <div class="graph-panel">
        <div class="graph-wrapper">
          <div ref="container" class="graph-container" :class="{'graph-loaded': graphLoaded}"></div>
          <Dock :model="dockItems" position="right" class="graph-dock">
            <template #itemicon="{item}">
              <Button
                class="dock-btn"
                :icon="item.icon"
                text
                rounded
                v-tooltip.left="item.label"
                @click="item.command" />
            </template>
          </Dock>
          <Transition name="fade">
            <ProgressSpinner v-if="isLoading" class="loading-overlay" />
          </Transition>
        </div>
      </div>
      <Transition name="slide-right">
        <div v-if="propertiesPanelVisible" class="properties-panel-wrapper">
          <div class="properties-content">
            <div class="properties-body">
              <div class="node-cards">
                <Card class="prop-card">
                  <template #title>
                    <div class="card-title">
                      <i class="pi pi-id-card" />
                      <span>Node Identifier</span>
                    </div>
                  </template>
                  <template #content>
                    <div v-if="!selectedNode" class="card-empty">
                      <i class="pi pi-share-alt empty-icon" />
                      <p>Select a node to see its identifier</p>
                    </div>
                    <div v-else class="kv-row">
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
                    </div>
                  </template>
                </Card>
                <Card class="prop-card">
                  <template #title>
                    <div class="card-title">
                      <i class="pi pi-list" />
                      <span>
                        Properties
                        <span v-if="selectedNode?.literals?.length" class="count-pill">
                          {{ selectedNode.literals.length }}
                        </span>
                      </span>
                    </div>
                  </template>
                  <template #content>
                    <div v-if="!selectedNode" class="card-empty">
                      <i class="pi pi-info-circle empty-icon" />
                      <p>Click a node to view its properties</p>
                    </div>
                    <div v-else-if="!selectedNode.literals?.length" class="card-empty">
                      <i class="pi pi-inbox empty-icon" />
                      <p>No properties found for this node</p>
                    </div>
                    <div v-else class="props-list">
                      <div class="prop-line" v-for="(lit, idx) in selectedNode.literals" :key="idx">
                        <a
                          class="kv-value link"
                          :href="iriHref(lit.predicate) || lit.predicate"
                          target="_blank"
                          rel="noopener noreferrer">
                          {{ lit.predicate }}
                        </a>
                        <span class="prop-text">:</span>
                        <a
                          v-if="lit.isIRI && isLinkableIRI(lit.value)"
                          class="prop-text link"
                          :href="iriHref(lit.value) || undefined"
                          target="_blank"
                          rel="noopener noreferrer">
                          {{ lit.value }}
                        </a>
                        <span v-else class="prop-text">
                          {{ lit.value }}
                        </span>
                      </div>
                    </div>
                  </template>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import {ref, computed, onMounted, onUnmounted, watch} from 'vue';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type * as $rdf from 'rdflib';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {PREDICATE_ALIAS_MAP} from '@/components/panels/rdf/jsonLdParser';
import {useSettings} from '@/settings/useSettings';
import {RdfTermType} from '@/components/panels/rdf/rdfUtils';
import Dock from 'primevue/dock';

interface SelectedNodeData {
  id: string;
  label: string;
  literals?: Array<{predicate: string; value: string; isIRI?: boolean}>;
}

interface PanelMenuItem {
  label: string;
  icon?: string;
  items?: PanelMenuItem[];
  command?: () => void;
  template?: string;
  isLink?: boolean;
  url?: string;
}

const settings = useSettings();
const showLargeGraphPrompt = ref(false);
const nodeCount = ref(0);
const isLoading = ref(false);
const graphLoaded = ref(false);
const physicsEnabled = ref(false);
const propertiesPanelVisible = ref(false);

const emit = defineEmits<{
  (e: 'cancel-render'): void;
}>();

const props = defineProps<{
  statements: $rdf.Statement[];
}>();

const dockItems = computed(() => [
  {
    label: 'Zoom In',
    icon: 'pi pi-search-plus',
    command: () => zoomIn(),
  },
  {
    label: 'Zoom Out',
    icon: 'pi pi-search-minus',
    command: () => zoomOut(),
  },
  {
    label: 'Fit to View',
    icon: 'pi pi-expand',
    command: () => zoomFit(),
  },
  {
    label: 'Reset Zoom',
    icon: 'pi pi-refresh',
    command: () => resetZoom(),
  },
  {
    label: physicsEnabled.value ? 'Stop' : 'Animate',
    icon: physicsEnabled.value ? 'pi pi-pause' : 'pi pi-play',
    command: () => togglePhysics(),
  },
  {
    label: propertiesPanelVisible.value ? 'Hide Properties' : 'Show Properties',
    icon: propertiesPanelVisible.value ? 'pi pi-eye-slash' : 'pi pi-eye',
    command: () => togglePropertiesPanel(),
  },
]);

const panelMenuItems = computed(() => {
  if (!selectedNode.value) {
    return [];
  }

  const items: PanelMenuItem[] = [];

  items.push({
    label: 'Node Identifier',
    icon: 'pi pi-id-card',
    items: [
      {
        label: selectedNode.value.id,
        icon: isIRI(selectedNode.value.id) ? 'pi pi-external-link' : 'pi pi-file-text',
        isLink: isIRI(selectedNode.value.id),
        url: isIRI(selectedNode.value.id) ? selectedNode.value.id : undefined,
      },
    ],
  });

  if (selectedNode.value.literals && selectedNode.value.literals.length > 0) {
    const propertyItems: PanelMenuItem[] = selectedNode.value.literals.map(lit => ({
      label: `${lit.predicate}: ${lit.value}`,
      icon: lit.isIRI ? 'pi pi-link' : 'pi pi-file-text',
      isLink: lit.isIRI && isLinkableIRI(lit.value),
      url: lit.isIRI && isLinkableIRI(lit.value) ? iriHref(lit.value) || undefined : undefined,
    }));

    items.push({
      label: `Properties (${propertyItems.length})`,
      icon: 'pi pi-list',
      items: propertyItems,
    });
  }

  return items;
});

cytoscape.use(coseBilkent);
const selectedCyNode = ref<cytoscape.NodeSingular | null>(null);
const container = ref<HTMLDivElement | null>(null);
const selectedNode = ref<SelectedNodeData | null>(null);
const expandedKeys = ref<Record<string, boolean>>({});

let cy: cytoscape.Core | null = null;

watch(
  panelMenuItems,
  newItems => {
    const keys: Record<string, boolean> = {};
    newItems.forEach((item, index) => {
      keys[index.toString()] = true;
    });
    expandedKeys.value = keys;
  },
  {deep: true}
);

function togglePropertiesPanel() {
  propertiesPanelVisible.value = !propertiesPanelVisible.value;
}

function countNodes(statements: readonly $rdf.Statement[]): number {
  const nodes = new Set<string>();

  for (const st of statements) {
    nodes.add(st.subject.value);
    if (st.object.termType !== RdfTermType.Literal) {
      nodes.add(st.object.value);
    }
  }

  return nodes.size;
}

function confirmRender(allow: boolean) {
  showLargeGraphPrompt.value = false;

  if (!allow) {
    emit('cancel-render');

    if (cy) {
      cy.destroy();
      cy = null;
    }
    return;
  }

  renderGraph(props.statements);
}

function isIRI(value: string): boolean {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('urn:') ||
    value.includes('://')
  );
}

function zoomIn() {
  if (cy) {
    const currentZoom = cy.zoom();
    cy.animate({
      zoom: currentZoom * 1.2,
      center: {
        eles: cy.nodes(':selected').length > 0 ? cy.nodes(':selected') : undefined,
      },
      duration: 300,
      easing: 'ease-in-out-cubic',
    });
  }
}

function zoomOut() {
  if (cy) {
    const currentZoom = cy.zoom();
    cy.animate({
      zoom: currentZoom / 1.2,
      duration: 300,
      easing: 'ease-in-out-cubic',
    });
  }
}

function zoomFit() {
  if (cy) {
    cy.animate({
      fit: {
        eles: cy.elements(),
        padding: 30,
      },
      duration: 400,
      easing: 'ease-in-out-cubic',
    });
  }
}

function resetZoom() {
  if (cy) {
    cy.animate({
      zoom: 1,
      center: {
        eles: cy.nodes(),
      },
      duration: 300,
      easing: 'ease-in-out-cubic',
    });
  }
}

function togglePhysics() {
  if (!cy) return;

  physicsEnabled.value = !physicsEnabled.value;

  if (physicsEnabled.value) {
    const layout = cy.layout({
      name: 'cose-bilkent',
      animate: true,
      animationDuration: 1000,
      randomize: false,
      idealEdgeLength: 220,
      edgeElasticity: 100,
      gravity: 80,
      numIter: 2500,
    });
    layout.run();
  }
}

function selectNode(node: any, nodeData: any) {
  if (selectedCyNode.value) {
    selectedCyNode.value.removeClass('selected');
  }

  node.addClass('selected');
  selectedCyNode.value = node;

  selectedNode.value = {
    id: nodeData.id,
    label: nodeData.label,
    literals: nodeData.literals,
  };
}

function getPredicateAlias(predicate: string): string {
  for (const [alias, uris] of Object.entries(PREDICATE_ALIAS_MAP)) {
    if (uris.includes(predicate)) {
      return alias;
    }
  }
  return toPrefixed(predicate);
}

function toPrefixed(iri: string): string {
  for (const [prefix, ns] of Object.entries(rdfStoreManager.namespaces.value)) {
    if (iri.startsWith(ns)) {
      return `${prefix}:${iri.slice(ns.length)}`;
    }
  }
  return iri;
}

function expandIRI(value: string): string | null {
  if (isIRI(value)) {
    return value;
  }

  const idx = value.indexOf(':');
  if (idx === -1) return null;

  const prefix = value.slice(0, idx);
  const local = value.slice(idx + 1);

  const ns = rdfStoreManager.namespaces.value[prefix];
  if (!ns) return null;

  return ns + local;
}

function isLinkableIRI(value: string): boolean {
  return isIRI(value) || expandIRI(value) !== null;
}

function iriHref(value: string): string | null {
  return expandIRI(value);
}

function renderGraph(statements: readonly $rdf.Statement[]) {
  if (!container.value) return;

  isLoading.value = true;

  const nodesMap = new Map<string, {literals?: Array<{predicate: string; value: string}>}>();
  const edges: any[] = [];

  const typePredicates = [
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'https://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'rdf:type',
    '@type',
  ];

  const existingSubjects = new Set<string>();
  for (const st of statements) {
    existingSubjects.add(st.subject.value);
  }

  for (const st of statements) {
    const s = st.subject.value;
    const p = st.predicate.value;
    const o = st.object.value;

    if (!nodesMap.has(s)) {
      nodesMap.set(s, {literals: []});
    }

    const isTypePredicate =
      typePredicates.includes(p) || p.endsWith('#type') || p.endsWith('/type');

    if (st.object.termType === RdfTermType.Literal) {
      nodesMap.get(s)!.literals!.push({
        predicate: getPredicateAlias(p),
        value: o,
        isIRI: isIRI(o),
      });
    } else if (isTypePredicate) {
      nodesMap.get(s)!.literals!.push({
        predicate: getPredicateAlias(p),
        value: toPrefixed(o),
        isIRI: isIRI(o),
      });
    } else if (!existingSubjects.has(o)) {
      nodesMap.get(s)!.literals!.push({
        predicate: getPredicateAlias(p),
        value: toPrefixed(o),
        isIRI: isIRI(o),
      });
    } else {
      if (!nodesMap.has(o)) {
        nodesMap.set(o, {literals: []});
      }
      edges.push({
        data: {
          id: `${s}-${p}-${o}`,
          source: s,
          target: o,
          label: getPredicateAlias(p),
          predicateIRI: p,
        },
      });
    }
  }

  const nodes = Array.from(nodesMap.entries()).map(([id, data]) => ({
    data: {
      id,
      label: toPrefixed(id),
      hasLiterals: data.literals && data.literals.length > 0,
      literalCount: data.literals?.length || 0,
      literals: data.literals,
    },
  }));

  const elements = [...nodes, ...edges];

  if (cy) {
    cy.destroy();
  }

  cy = cytoscape({
    container: container.value,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#4299e1',
          'border-width': 2,
          'border-color': '#2c5282',
          label: 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'min-width': 60,
          'min-height': 30,
          color: '#fff',
          'font-size': '12px',
          'font-weight': 'bold',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          width: 'label',
          height: 30,
          padding: '15px',
          shape: 'roundrectangle',
          'transition-property': 'background-color, border-color, border-width',
          'transition-duration': '0.3s',
        },
      },
      {
        selector: 'node.selected',
        style: {
          'background-color': '#2b6cb0',
          'border-width': 4,
          'border-color': '#1a365d',
        },
      },
      {
        selector: 'node[hasLiterals]',
        style: {
          'border-color': '#f6ad55',
          'border-width': 3,
        },
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#a0aec0',
          'target-arrow-color': '#a0aec0',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'control-point-step-size': 100,
          label: 'data(label)',
          'font-size': '12px',
          'text-rotation': 'autorotate',
          'text-background-color': '#f7fafc',
          'text-background-opacity': 1,
          'transition-property': 'line-color, width',
          'transition-duration': '0.3s',
        },
      },
    ],
    layout: {
      name: 'cose-bilkent',
      animate: true,
      animationDuration: 1000,
      animationEasing: 'ease-in-out-cubic',
      randomize: true,
      idealEdgeLength: 220,
      edgeElasticity: 100,
      gravity: 80,
      numIter: 1000000,
      tile: true,
      tilingPaddingVertical: 10,
      tilingPaddingHorizontal: 10,
      nodeDimensionsIncludeLabels: true,
      avoidOverlap: true,
      avoidOverlapPadding: 50,
    },
  });

  cy.userPanningEnabled(true);
  cy.userZoomingEnabled(true);
  cy.boxSelectionEnabled(true);

  cy.on('layoutstop', () => {
    isLoading.value = false;
    graphLoaded.value = true;
  });

  cy.on('tap', 'node', event => {
    const node = event.target;
    const nodeData = node.data();

    node.animate({
      style: {'border-width': 6},
      duration: 200,
      complete: function () {
        node.animate({
          style: {'border-width': 4},
          duration: 200,
        });
      },
    });

    selectNode(node, nodeData);
  });

  cy.on('tap', event => {
    if (event.target === cy) {
      if (selectedCyNode.value) {
        selectedCyNode.value.removeClass('selected');
      }
      selectedCyNode.value = null;
      selectedNode.value = null;
    }
  });

  cy.on('tap', 'edge', event => {
    const edge = event.target;
    const predicateIRI = edge.data('predicateIRI');

    edge.animate({
      style: {width: 5},
      duration: 200,
      complete: function () {
        edge.animate({
          style: {width: 2},
          duration: 200,
        });
      },
    });

    const href = iriHref(predicateIRI);
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  });

  cy.on('mouseover', 'edge', () => {
    if (container.value) {
      container.value.style.cursor = 'pointer';
    }
  });

  cy.on('mouseout', 'edge', () => {
    if (container.value) {
      container.value.style.cursor = 'default';
    }
  });

  cy.on('dbltap', 'node', event => {
    const node = event.target;
    cy.animate({
      fit: {
        eles: node.neighborhood().add(node),
        padding: 100,
      },
      duration: 500,
      easing: 'ease-in-out-cubic',
    });
  });
}

onMounted(() => {
  nodeCount.value = countNodes(props.statements);

  if (nodeCount.value > settings.value.rdf.maximumNodesToVisualize) {
    showLargeGraphPrompt.value = true;
  } else {
    renderGraph(props.statements);
  }

  const resizeObserver = new ResizeObserver(() => {
    if (cy) {
      cy.resize();
      cy.fit(undefined, 30);
    }
  });

  if (container.value) {
    resizeObserver.observe(container.value);
  }

  onUnmounted(() => {
    resizeObserver.disconnect();
    if (cy) {
      cy.destroy();
      cy = null;
    }
  });
});
</script>

<style scoped>
.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.graph-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
}

.graph-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.graph-container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

.graph-container.graph-loaded {
  opacity: 1;
}

.graph-dock {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  z-index: 20;
}

.graph-dock :deep(.p-dock) {
  background: transparent;
}

.graph-dock :deep(.p-dock-list) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Properties Panel */
.properties-panel-wrapper {
  display: flex;
  flex-direction: column;
  background: white;
  border-left: 1px solid #e2e8f0;
  overflow: hidden;
  width: 350px;
  flex-shrink: 0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.properties-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.properties-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.properties-title i {
  font-size: 16px;
}

.panel-close-btn {
  margin-left: auto;
}

.panel-close-btn :deep(.p-button) {
  color: white;
}

.properties-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.properties-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.node-properties-panel {
  border: none;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.node-properties-panel :deep(.p-panelmenu) {
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-header > a) {
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 16px;
  color: #1e293b;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  word-wrap: break-word;
  white-space: normal;
  overflow-wrap: break-word;
  cursor: pointer;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-header > a:hover) {
  background: #edf2f7;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-header.p-highlight > a) {
  background: #667eea;
  color: white;
  border-bottom-color: #667eea;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-content) {
  background: #ffffff;
  padding: 0;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  max-height: none;
  overflow: visible;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-content .p-menu) {
  border: none;
  background: transparent;
  padding: 8px 0;
  max-height: none;
  display: flex;
  flex-direction: column;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-content .p-menu .p-menuitem) {
  border: none;
  display: flex;
  width: 100%;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-content .p-menu .p-menuitem > a) {
  padding: 10px 16px;
  color: #475569;
  font-size: 13px;
  border-radius: 0;
  transition: all 0.2s ease;
  word-break: break-word;
  white-space: normal;
  overflow-wrap: break-word;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  cursor: pointer;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-content .p-menu .p-menuitem > a:hover) {
  background: #f1f5f9;
  color: #4299e1;
}

.node-properties-panel :deep(.p-panelmenu .p-panelmenu-item) {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.panel-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  word-break: break-word;
}

.panel-menu-icon {
  font-size: 12px;
  color: #667eea;
  flex-shrink: 0;
  opacity: 0.7;
}

.panel-menu-label {
  flex: 1;
}

.properties-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  padding: 24px;
  text-align: center;
  flex: 1;
}

.properties-empty i {
  font-size: 48px;
  opacity: 0.3;
}

.properties-empty p {
  font-size: 13px;
  margin: 0;
  line-height: 1.5;
}

:deep(.p-splitter) {
  background: white;
}

:deep(.p-splitter-gutter) {
  background: #e2e8f0;
  transition: background-color 0.3s ease;
}

:deep(.p-splitter-gutter:hover) {
  background: #cbd5e0;
}

:deep(.p-splitter-gutter-resizing) {
  background: #667eea;
}

:deep(.p-splitter-gutter-icon) {
  color: #94a3b8;
}

.smooth-splitter :deep(.p-splitter-panel) {
  transition: flex 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Slide-right Transition */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (prefers-color-scheme: dark) {
  .graph-container {
    background: #1a202c;
  }

  .toggle-properties-btn {
    background: #667eea;
  }

  .toggle-properties-btn:hover {
    background: #5568d3;
  }

  .properties-panel-wrapper {
    background: #1a202c;
    border-left-color: #4a5568;
  }

  .node-properties-panel :deep(.p-panelmenu .p-panelmenu-header > a) {
    background: #2d3748;
    color: #e2e8f0;
    border-bottom-color: #4a5568;
  }

  .node-properties-panel :deep(.p-panelmenu .p-panelmenu-header > a:hover) {
    background: #4a5568;
  }

  .node-properties-panel :deep(.p-panelmenu .p-panelmenu-header.p-highlight > a) {
    background: #667eea;
    color: white;
  }

  .node-properties-panel :deep(.p-panelmenu .p-panelmenu-content) {
    background: #1a202c;
    border-bottom-color: #4a5568;
  }

  .node-properties-panel :deep(.p-panelmenu .p-panelmenu-content .p-menu .p-menuitem > a) {
    color: #cbd5e0;
  }

  .node-properties-panel :deep(.p-panelmenu .p-panelmenu-content .p-menu .p-menuitem > a:hover) {
    background: #2d3748;
    color: #a5b4fc;
  }

  .properties-empty {
    color: #64748b;
  }

  .panel-menu-icon {
    color: #a5b4fc;
  }

  :deep(.p-splitter) {
    background: #1a202c;
  }

  :deep(.p-splitter-gutter) {
    background: #4a5568;
  }

  :deep(.p-splitter-gutter:hover) {
    background: #64748b;
  }

  :deep(.p-splitter-gutter-resizing) {
    background: #667eea;
  }

  :deep(.p-splitter-gutter-icon) {
    color: #64748b;
  }
}

@media (max-width: 1024px) {
}

@media (max-width: 768px) {
  :deep(.p-splitter) {
    flex-direction: column;
  }

  .properties-panel-wrapper {
    min-height: 200px;
  }
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
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
  word-break: break-word;
}

.kv-row:last-child {
  border-bottom: none;
}

.kv-icon,
.prop-icon {
  font-size: 12px;
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}

.kv-value,
.prop-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.35;
  word-break: break-word;
}

.props-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prop-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
  word-break: break-word;
}

.link {
  color: #2563eb;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
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
}

.card-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  color: #94a3b8;
  text-align: center;
}

.empty-icon {
  font-size: 28px;
  opacity: 0.4;
}

.card-empty p {
  font-size: 13px;
  margin: 0;
}

@media (prefers-color-scheme: dark) {
  .card-empty {
    color: #64748b;
  }
}
</style>
