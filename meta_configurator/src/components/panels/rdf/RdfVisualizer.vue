<template>
  <div style="width: 100%; height: 100%; position: relative">
    <Dialog
      v-model:visible="showLargeGraphPrompt"
      header="Large graph detected"
      modal
      :closable="false">
      <div class="flex items-center gap-4">
        <i class="pi pi-exclamation-circle !text-3xl" />
        <span>
          This graph contains <b>{{ nodeCount }}</b> nodes. Rendering may be slow for graphs with
          more than <b>{{ settings.rdf.maximumNodesToVisualize }}</b> nodes.
          <br />
          Do you want to continue?
        </span>
      </div>
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

    <div ref="container" class="graph-container" :class="{'graph-loaded': graphLoaded}"></div>

    <Transition name="slide-up">
      <div v-if="selectedNode" class="properties-panel">
        <button @click="closeTooltip" class="panel-close">&times;</button>
        <div class="panel-header">
          <div class="panel-icon">
            <i class="pi pi-sitemap"></i>
          </div>
          <div class="panel-title-section">
            <span class="panel-subtitle">Node Details</span>
            <h4 class="panel-title">{{ selectedNode.label }}</h4>
          </div>
        </div>

        <div class="panel-body">
          <div class="info-section">
            <div class="section-label">
              <i class="pi pi-id-card"></i>
              <span>Identifier</span>
            </div>
            <div class="section-value">
              <a
                v-if="isIRI(selectedNode.id)"
                :href="iriHref(selectedNode.id)!"
                target="_blank"
                rel="noopener noreferrer"
                class="value-link">
                {{ selectedNode.id }}
                <i class="pi pi-external-link"></i>
              </a>
              <span v-else class="value-text">{{ selectedNode.id }}</span>
            </div>
          </div>

          <div
            v-if="selectedNode.literals && selectedNode.literals.length > 0"
            class="properties-container">
            <div class="section-label">
              <i class="pi pi-list"></i>
              <span>Properties ({{ selectedNode.literals.length }})</span>
            </div>

            <div class="properties-list">
              <div
                v-for="(lit, idx) in selectedNode.literals"
                :key="idx"
                class="property-row"
                :style="{animationDelay: `${idx * 30}ms`}">
                <div class="property-key-row">
                  <i class="pi pi-angle-right key-icon"></i>
                  <a
                    v-if="isLinkableIRI(lit.predicate)"
                    :href="iriHref(lit.predicate)!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="key-link">
                    {{ lit.predicate }}
                  </a>
                  <span v-else class="key-text">{{ lit.predicate }}</span>
                </div>
                <div class="property-value-row">
                  <a
                    v-if="isLinkableIRI(lit.value)"
                    :href="iriHref(lit.value)!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="value-link">
                    {{ lit.value }}
                    <i class="pi pi-external-link"></i>
                  </a>
                  <span v-else class="value-text">{{ lit.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="no-properties">
            <i class="pi pi-inbox"></i>
            <span>No properties available</span>
          </div>

          <div class="panel-actions">
            <button @click="focusOnNode" class="action-btn primary">
              <i class="pi pi-eye"></i>
              <span>Focus</span>
            </button>
            <button @click="closeTooltip" class="action-btn secondary">
              <i class="pi pi-times"></i>
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div class="zoom-controls">
      <button @click="zoomIn" class="zoom-btn" title="Zoom In">
        <i class="pi pi-search-plus" />
      </button>
      <button @click="zoomOut" class="zoom-btn" title="Zoom Out">
        <i class="pi pi-search-minus" />
      </button>
      <button @click="zoomFit" class="zoom-btn" title="Fit to View">
        <i class="pi pi-expand" />
      </button>
      <button @click="resetZoom" class="zoom-btn" title="Reset Zoom">
        <i class="pi pi-refresh" />
      </button>
      <button @click="togglePhysics" class="zoom-btn" title="Toggle Physics">
        <i :class="physicsEnabled ? 'pi pi-pause' : 'pi pi-play'" />
      </button>
    </div>

    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <i class="pi pi-spin pi-spinner" style="font-size: 3rem"></i>
          <p>Rendering graph...</p>
        </div>
      </div>
    </Transition>

    <Transition name="slide-up">
      <div v-if="showStats" class="stats-panel">
        <button @click="showStats = false" class="stats-close">&times;</button>
        <h4>Graph Statistics</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Nodes:</span>
            <span class="stat-value">{{ nodeCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Edges:</span>
            <span class="stat-value">{{ edgeCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Selected:</span>
            <span class="stat-value">{{ selectedNode?.label || 'None' }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <button @click="showStats = !showStats" class="stats-toggle" title="Toggle Stats">
      <i class="pi pi-chart-bar" />
    </button>

    <button
      @click="showTooltipOnClick = !showTooltipOnClick"
      class="tooltip-toggle"
      :class="{active: showTooltipOnClick}"
      title="Toggle Tooltip on Click">
      <i class="pi pi-info-circle" />
    </button>
  </div>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import {ref, onMounted, onUnmounted} from 'vue';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type * as $rdf from 'rdflib';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {PREDICATE_ALIAS_MAP} from '@/components/panels/rdf/jsonLdParser';
import {useSettings} from '@/settings/useSettings';

const settings = useSettings();

const showLargeGraphPrompt = ref(false);
const nodeCount = ref(0);
const edgeCount = ref(0);
const isLoading = ref(false);
const graphLoaded = ref(false);
const showStats = ref(false);
const physicsEnabled = ref(false);
const showTooltipOnClick = ref(false);

const emit = defineEmits<{
  (e: 'cancel-render'): void;
}>();

const props = defineProps<{
  statements: $rdf.Statement[];
}>();

cytoscape.use(coseBilkent);
const selectedCyNode = ref<cytoscape.NodeSingular | null>(null);
const container = ref<HTMLDivElement | null>(null);
const selectedNode = ref<SelectedNodeData | null>(null);

let cy: cytoscape.Core | null = null;

interface SelectedNodeData {
  id: string;
  label: string;
  literals?: Array<{predicate: string; value: string; isIRI?: boolean}>;
  position?: {x: number; y: number};
}

function countNodes(statements: readonly $rdf.Statement[]): number {
  const nodes = new Set<string>();

  for (const st of statements) {
    nodes.add(st.subject.value);
    if (st.object.termType !== 'Literal') {
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

function closeTooltip() {
  if (selectedCyNode.value) {
    selectedCyNode.value.removeClass('selected');
  }
  selectedCyNode.value = null;
  selectedNode.value = null;
}

function focusOnNode() {
  if (!cy || !selectedCyNode.value) return;

  cy.animate({
    fit: {
      eles: selectedCyNode.value.neighborhood().add(selectedCyNode.value),
      padding: 100,
    },
    duration: 500,
    easing: 'ease-in-out-cubic',
  });
}

function showNodeTooltip(node: any, nodeData: any) {
  if (selectedCyNode.value) {
    selectedCyNode.value.removeClass('selected');
  }

  node.addClass('selected');
  selectedCyNode.value = node;

  if (showTooltipOnClick.value) {
    selectedNode.value = {
      id: nodeData.id,
      label: nodeData.label,
      literals: nodeData.literals,
    };
  }

  const neighbors = node.neighborhood();
  neighbors.addClass('highlighted');

  setTimeout(() => {
    neighbors.removeClass('highlighted');
  }, 2000);
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

    if (st.object.termType === 'Literal') {
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

  edgeCount.value = edges.length;

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
        selector: 'node:hover',
        style: {
          'background-color': '#3182ce',
          'border-width': 3,
          'border-color': '#1a365d',
        },
      },
      {
        selector: 'node.selected',
        style: {
          'background-color': '#2b6cb0',
          'border-width': 4,
          'border-color': '#1a365d',
          'box-shadow': '0 0 20px rgba(66, 153, 225, 0.6)',
        },
      },
      {
        selector: 'node.highlighted',
        style: {
          'background-color': '#48bb78',
          'border-color': '#2f855a',
          'transition-duration': '0.5s',
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
          'font-size': '11px',
          color: '#2d3748',
          'text-rotation': 'autorotate',
          'text-margin-y': -10,
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.8,
          'text-background-padding': '3px',
          'transition-property': 'line-color, width',
          'transition-duration': '0.3s',
        },
      },
      {
        selector: 'edge:hover',
        style: {
          'line-color': '#4299e1',
          'target-arrow-color': '#4299e1',
          width: 3,
        },
      },
      {
        selector: 'edge.highlighted',
        style: {
          'line-color': '#48bb78',
          'target-arrow-color': '#48bb78',
          width: 3,
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

    showNodeTooltip(node, nodeData);
  });

  cy.on('tap', event => {
    if (event.target === cy) {
      closeTooltip();
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
.graph-container {
  width: 100%;
  height: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

.graph-container.graph-loaded {
  opacity: 1;
}

.properties-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 12px;
  padding: 0;
  min-width: 320px;
  max-width: 400px;
  max-height: calc(100vh - 120px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 20px;
  color: white;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
  z-index: 10;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.panel-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.panel-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.panel-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  backdrop-filter: blur(10px);
}

.panel-title-section {
  flex: 1;
  min-width: 0;
}

.panel-subtitle {
  display: block;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.9;
  margin-bottom: 2px;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  word-break: break-word;
  line-height: 1.3;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.info-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #805ad5;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.section-label i {
  font-size: 12px;
}

.section-value {
  padding-left: 18px;
}

.value-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4299e1;
  text-decoration: none;
  font-size: 12px;
  word-break: break-all;
  transition: all 0.2s;
  padding: 4px 0;
}

.value-link:hover {
  color: #2b6cb0;
}

.value-link i {
  font-size: 10px;
  opacity: 0.7;
}

.value-text {
  font-size: 12px;
  color: #2d3748;
  word-break: break-all;
  line-height: 1.5;
}

.properties-container {
  margin-bottom: 16px;
}

.properties-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.property-row {
  background: #f7fafc;
  border-left: 3px solid #4299e1;
  border-radius: 6px;
  padding: 10px 12px;
  transition: all 0.2s;
  animation: fadeInLeft 0.3s ease-out backwards;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.property-row:hover {
  background: #edf2f7;
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.1);
}

.property-key-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.key-icon {
  font-size: 10px;
  color: #4299e1;
  opacity: 0.7;
}

.key-link {
  font-size: 11px;
  font-weight: 600;
  color: #4299e1;
  text-decoration: none;
  transition: color 0.2s;
}

.key-link:hover {
  color: #2b6cb0;
  text-decoration: underline;
}

.key-text {
  font-size: 11px;
  font-weight: 600;
  color: #4299e1;
}

.property-value-row {
  padding-left: 16px;
}

.property-value-row .value-text {
  font-size: 12px;
  color: #4a5568;
}

.property-value-row .value-link {
  font-size: 12px;
  color: #2d3748;
}

.property-value-row .value-link:hover {
  color: #4299e1;
}

.no-properties {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: #a0aec0;
  text-align: center;
}

.no-properties i {
  font-size: 32px;
  opacity: 0.5;
}

.no-properties span {
  font-size: 13px;
  font-style: italic;
}

.panel-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.action-btn.secondary {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.action-btn.secondary:hover {
  background: #edf2f7;
}

.action-btn i {
  font-size: 12px;
}

.panel-body::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

@media (prefers-color-scheme: dark) {
  .properties-panel {
    background: #1a202c;
    border-color: #4a5568;
  }

  .info-section {
    border-bottom-color: #4a5568;
  }

  .value-text,
  .panel-title {
    color: #e2e8f0;
  }

  .property-row {
    background: #2d3748;
  }

  .property-row:hover {
    background: #4a5568;
  }

  .property-value-row .value-text {
    color: #cbd5e0;
  }

  .property-value-row .value-link {
    color: #e2e8f0;
  }

  .panel-actions {
    border-top-color: #4a5568;
  }

  .action-btn.secondary {
    background: #2d3748;
    color: #e2e8f0;
    border-color: #4a5568;
  }

  .action-btn.secondary:hover {
    background: #4a5568;
  }

  .panel-body::-webkit-scrollbar-track {
    background: #2d3748;
  }

  .panel-body::-webkit-scrollbar-thumb {
    background: #4a5568;
  }
}

.zoom-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.zoom-btn:hover {
  background: #4299e1;
  border-color: #3182ce;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
  transform: translateY(-2px);
}

.zoom-btn:hover i {
  color: white;
}

.zoom-btn:active {
  transform: translateY(0) scale(0.95);
}

.zoom-btn i {
  color: #4a5568;
  transition: color 0.3s;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(5px);
}

.loading-spinner {
  text-align: center;
  color: #4299e1;
}

.loading-spinner p {
  margin-top: 16px;
  font-size: 14px;
  font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.stats-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.stats-panel h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #718096;
  font-weight: 500;
}

.stat-value {
  font-size: 14px;
  color: #2d3748;
  font-weight: 600;
}

.stats-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 20px;
  color: #718096;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.stats-close:hover {
  background: #edf2f7;
  color: #2d3748;
}

.stats-toggle {
  position: absolute;
  bottom: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.stats-toggle:hover {
  background: #4299e1;
  border-color: #3182ce;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
  transform: translateY(-2px);
}

.stats-toggle:hover i {
  color: white;
}

.stats-toggle i {
  color: #4a5568;
  transition: color 0.3s;
}

.tooltip-toggle {
  position: absolute;
  bottom: 16px;
  left: 68px;
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.tooltip-toggle:hover {
  background: #805ad5;
  border-color: #6b46c1;
  box-shadow: 0 4px 12px rgba(128, 90, 213, 0.4);
  transform: translateY(-2px);
}

.tooltip-toggle.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.tooltip-toggle:hover i,
.tooltip-toggle.active i {
  color: white;
}

.tooltip-toggle i {
  color: #4a5568;
  transition: color 0.3s;
}

.tooltip-toggle.active i {
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.slide-up-enter-active {
  animation: slideUp 0.3s ease-out;
}

.slide-up-leave-active {
  animation: slideDown 0.3s ease-in;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(20px);
    opacity: 0;
  }
}

@media (prefers-color-scheme: dark) {
  .graph-container {
    border-color: #4a5568;
  }

  .node-tooltip,
  .stats-panel,
  .zoom-btn,
  .stats-toggle {
    background: #2d3748;
    border-color: #4a5568;
  }

  .tooltip-content,
  .stats-panel {
    color: #e2e8f0;
  }

  .property-item {
    background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
  }

  .stat-label {
    color: #a0aec0;
  }

  .stat-value,
  .stats-panel h4 {
    color: #e2e8f0;
  }

  .loading-overlay {
    background: rgba(26, 32, 44, 0.95);
  }
}

.tooltip-content::-webkit-scrollbar {
  width: 6px;
}

.tooltip-content::-webkit-scrollbar-track {
  background: #edf2f7;
  border-radius: 3px;
}

.tooltip-content::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.tooltip-content::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>
