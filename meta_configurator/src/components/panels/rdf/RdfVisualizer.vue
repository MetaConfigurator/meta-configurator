<template>
  <div style="width: 100%; height: 100%; position: relative">
    <div ref="container" style="width: 100%; height: 100%; border: 1px solid #ccc"></div>
    <div v-if="selectedNode" ref="tooltip" class="node-tooltip">
      <div class="tooltip-header">
        <h4>{{ selectedNode.label }}</h4>
        <button @click="closeTooltip" class="close-btn">&times;</button>
      </div>
      <div class="tooltip-content">
        <div class="property-item id-section">
          <span class="property-key">ID:</span>
          <a
            v-if="isIRI(selectedNode.id)"
            :href="iriHref(selectedNode.id)!"
            target="_blank"
            rel="noopener noreferrer"
            class="property-link">
            {{ selectedNode.id }}
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="currentColor"
              style="margin-left: 4px">
              <path
                d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
              <path
                d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
            </svg>
          </a>
          <span v-else class="property-value">{{ selectedNode.id }}</span>
        </div>
        <div v-if="selectedNode.literals && selectedNode.literals.length > 0">
          <h5>Properties:</h5>
          <div class="property-list">
            <div v-for="(lit, idx) in selectedNode.literals" :key="idx" class="property-item">
              <a
                v-if="isLinkableIRI(lit.predicate)"
                :href="iriHref(lit.predicate)!"
                target="_blank"
                rel="noopener noreferrer"
                class="property-key property-link">
                {{ lit.predicate }}:
              </a>
              <span v-else class="property-key"> {{ lit.predicate }}: </span>
              <a
                v-if="isLinkableIRI(lit.value)"
                :href="iriHref(lit.value)!"
                target="_blank"
                rel="noopener noreferrer"
                class="property-link">
                {{ lit.value }}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  style="margin-left: 4px">
                  <path
                    d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
                  <path
                    d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
                </svg>
              </a>
              <span v-else class="property-value">
                {{ lit.value }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="no-properties">No literal properties</div>
      </div>
    </div>
    <div class="zoom-controls">
      <button @click="zoomIn" class="zoom-btn" title="Zoom In">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
        </svg>
      </button>
      <button @click="zoomOut" class="zoom-btn" title="Zoom Out">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z" />
        </svg>
      </button>
      <button @click="zoomFit" class="zoom-btn" title="Fit to View">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z" />
        </svg>
      </button>
      <button @click="resetZoom" class="zoom-btn" title="Reset Zoom">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
          <path
            d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, watch, onMounted, onUnmounted} from 'vue';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type * as $rdf from 'rdflib';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import {PREDICATE_ALIAS_MAP} from '@/components/panels/rdf/jsonLdParser';

const selectedCyNode = ref<cytoscape.NodeSingular | null>(null);
cytoscape.use(coseBilkent);
const container = ref<HTMLDivElement | null>(null);
const tooltip = ref<HTMLDivElement | null>(null);
let cy: cytoscape.Core | null = null;

interface SelectedNodeData {
  id: string;
  label: string;
  literals?: Array<{predicate: string; value: string; isIRI?: boolean}>;
  position?: {x: number; y: number};
}

const selectedNode = ref<SelectedNodeData | null>(null);

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
    cy.zoom({
      level: currentZoom * 1.2,
      renderedPosition: {x: cy.width() / 2, y: cy.height() / 2},
    });
  }
}

function zoomOut() {
  if (cy) {
    const currentZoom = cy.zoom();
    cy.zoom({
      level: currentZoom / 1.2,
      renderedPosition: {x: cy.width() / 2, y: cy.height() / 2},
    });
  }
}

function zoomFit() {
  if (cy) {
    cy.fit(undefined, 30);
  }
}

function resetZoom() {
  if (cy) {
    cy.zoom(1);
    cy.center();
  }
}

function closeTooltip() {
  selectedNode.value = null;
}

function showNodeTooltip(node: any, nodeData: any) {
  selectedNode.value = {
    id: nodeData.id,
    label: nodeData.label,
    literals: nodeData.literals,
  };
}

function updateTooltipPosition() {
  if (!cy || !container.value || !tooltip.value || !selectedCyNode.value) return;

  const node = selectedCyNode.value;
  const position = node.renderedPosition();

  const containerWidth = container.value.clientWidth;
  const containerHeight = container.value.clientHeight;
  const tooltipRect = tooltip.value.getBoundingClientRect();

  let left = position.x + 20;
  let top = position.y - tooltipRect.height / 2;

  if (left + tooltipRect.width > containerWidth) {
    left = position.x - tooltipRect.width - 20;
  }

  if (top < 0) {
    top = 10;
  } else if (top + tooltipRect.height > containerHeight) {
    top = containerHeight - tooltipRect.height - 10;
  }

  tooltipStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
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

  //   cy = cytoscape({
  //   container: container.value,
  //   elements,
  //   style: [/* your styles */],
  //   layout: {
  //     name: 'cose-bilkent',
  //     animate: true,       // keep nodes moving
  //     animationDuration: 1000,
  //     randomize: true,
  //     idealEdgeLength: 150,
  //     nodeRepulsion: 400000,
  //     edgeElasticity: 100,
  //     gravity: 80,
  //     numIter: 1000,
  //     tile: true,
  //     tilingPaddingVertical: 10,
  //     tilingPaddingHorizontal: 10,
  //   },
  // });

  cy = cytoscape({
    container: container.value,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#4299e1',
          'border-width': 2,
          'border-color': '#333',
          label: 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          color: '#fff',
          'font-size': '12px',
          'font-weight': 'bold',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          width: 'label',
          height: 30,
          padding: '15px',
          shape: 'roundrectangle',
        },
      },
      {
        selector: 'node[hasLiterals]',
        style: {
          'border-color': '#FFD700',
          'border-width': 3,
        },
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#999',
          'target-arrow-color': '#999',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(label)',
          'font-size': '11px',
          color: '#555',
          'text-rotation': 'autorotate',
          'text-margin-y': -10,
          'text-background-color': '#fff',
          'text-background-opacity': 0.8,
          'text-background-padding': '3px',
        },
      },
    ],
    layout: {
      name: 'cose-bilkent',
      animate: true,
      animationDuration: 1000,
      randomize: true,
      idealEdgeLength: 150,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      gravity: 80,
      numIter: 1000,
      tile: true,
      tilingPaddingVertical: 10,
      tilingPaddingHorizontal: 10,
    },
  });

  cy.userPanningEnabled(true);
  cy.userZoomingEnabled(true);
  cy.boxSelectionEnabled(true);

  cy.on('position drag', 'node', evt => {
    if (evt.target === selectedCyNode.value) {
      updateTooltipPosition();
    }
  });

  cy.on('pan zoom', () => {
    updateTooltipPosition();
  });

  cy.on('layoutstop', () => {
    updateTooltipPosition();
  });

  cy.on('tap', 'node', event => {
    const node = event.target;
    const nodeData = node.data();
    showNodeTooltip(node, nodeData);
  });

  cy.on('tap', event => {
    if (event.target === cy) {
      closeTooltip();
    }
  });
}

onMounted(() => {
  renderGraph(rdfStoreManager.statements.value);

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

watch(
  () => [rdfStoreManager.statements.value, rdfStoreManager.namespaces.value],
  () => renderGraph(rdfStoreManager.statements.value),
  {deep: false}
);
</script>

<style scoped>
.node-tooltip {
  position: absolute;
  right: 16px;
  bottom: 16px;

  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 250px;
  max-width: 400px;
  z-index: 1000;
  pointer-events: auto;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.tooltip-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  word-break: break-word;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.tooltip-content {
  padding: 12px 16px;
  max-height: 300px;
  overflow-y: auto;
}

.tooltip-content h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #4299e1;
}

.property-key {
  font-size: 12px;
  font-weight: 600;
  color: #4299e1;
}

.property-value {
  font-size: 13px;
  color: #333;
  word-break: break-word;
}

.property-link {
  font-size: 13px;
  color: #4299e1;
  text-decoration: none;
  word-break: break-all;
  display: inline-flex;
  align-items: center;
  transition: color 0.2s;
}

.property-link:hover {
  color: #2b6cb0;
  text-decoration: underline;
}

.property-link svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.id-section {
  border-left-color: #805ad5;
  margin-bottom: 12px;
}

.id-section .property-key {
  color: #805ad5;
}

.no-properties {
  color: #999;
  font-style: italic;
  font-size: 13px;
  text-align: center;
  padding: 12px;
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.zoom-btn {
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.zoom-btn:hover {
  background: #f0f0f0;
  border-color: #999;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.zoom-btn:active {
  transform: scale(0.95);
}

.zoom-btn svg {
  color: #333;
}
</style>
