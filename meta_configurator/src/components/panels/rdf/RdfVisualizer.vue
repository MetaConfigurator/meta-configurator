<template>
  <div style="width: 100%; height: 100%; display: flex; position: relative">
    <RdfVisualizerDialogs
      :showLargeGraphPrompt="showLargeGraphPrompt"
      :nodeCount="nodeCount"
      :maximumNodesToVisualize="settings.rdf.maximumNodesToVisualize"
      :deletePropertyDialog="deletePropertyDialog"
      :deleteNodeDialog="deleteNodeDialog"
      :renameNodeDialog="renameNodeDialog"
      :renameNodeValue="renameNodeValue"
      @update:showLargeGraphPrompt="showLargeGraphPrompt = $event"
      @confirm-render="confirmRender"
      @update:deletePropertyDialog="deletePropertyDialog = $event"
      @confirm-delete-property="confirmDeleteProperty"
      @update:deleteNodeDialog="deleteNodeDialog = $event"
      @confirm-delete-node="confirmDeleteNode"
      @update:renameNodeDialog="renameNodeDialog = $event"
      @update:renameNodeValue="renameNodeValue = $event"
      @confirm-rename-node="confirmRenameNode" />
    <Splitter class="rdf-splitter" :gutter-size="propertiesPanelVisible ? 8 : 0">
      <SplitterPanel class="graph-panel">
        <div class="graph-wrapper" :class="{'graph-frozen': hasGraphError}">
          <div ref="container" class="graph-container" :class="{'graph-loaded': graphLoaded}"></div>
          <Dock :model="dockItems" position="right" class="graph-dock">
            <template #itemicon="{item}">
              <Button
                :icon="item.icon"
                rounded
                raised
                :disabled="hasGraphError"
                v-tooltip.left="item.label"
                @click="item.command" />
            </template>
          </Dock>
          <Dock
            v-if="!props.readOnly"
            :model="bottomDockItems"
            position="bottom"
            class="graph-dock-bottom">
            <template #itemicon="{item}">
              <Button
                :icon="item.icon"
                rounded
                raised
                v-tooltip.top="item.label"
                @click="item.command" />
            </template>
          </Dock>
          <Transition name="fade">
            <ProgressSpinner v-if="isLoading" class="loading-overlay" />
          </Transition>
          <div v-if="hasGraphError" class="graph-freeze-overlay">
            <Message severity="error" :closable="false">
              Graph is disabled because the data contains errors.
            </Message>
          </div>
        </div>
      </SplitterPanel>
      <SplitterPanel
        v-if="propertiesPanelVisible"
        :size="propertiesPanelSize"
        :minSize="propertiesPanelMinSize">
        <RdfVisualizerSidebar
          :hasGraphError="hasGraphError"
          :nodeSearchQuery="nodeSearchQuery"
          :nodeSearchResults="nodeSearchResults"
          :selectedNode="selectedNode"
          :readOnly="props.readOnly"
          :isRefreshingNode="isRefreshingNode"
          :propertyUpdateKey="propertyUpdateKey"
          :iriHref="jsonLdContextManager.iriHref"
          :isIRI="jsonLdContextManager.isIRI"
          :isLinkableIRI="jsonLdContextManager.isLinkableIRI"
          @update:nodeSearchQuery="nodeSearchQuery = $event"
          @node-search-complete="onNodeSearch"
          @select-node-by-id="selectNodeById"
          @clear-node-search="clearNodeSearch"
          @edit-node="editSelectedNode"
          @delete-node="deleteSelectedNode"
          @delete-property="deleteProperty"
          @edit-property="editProperty"
          @add-property="addPropertyToSelected"
          @add-node="addNodeFromVisualizer"
          @property-link-click="handlePropertyLinkClick" />
      </SplitterPanel>
    </Splitter>
  </div>
</template>
<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import {ref, computed, onMounted, onUnmounted, watch, nextTick} from 'vue';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type * as $rdf from 'rdflib';
import {rdfStoreManager, type RdfChange} from '@/components/panels/rdf/rdfStoreManager';
import {useSettings} from '@/settings/useSettings';
import {
  type RdfNodeLiteral,
  type SelectedNodeData,
  RdfTermType,
  type RdfTermTypeString,
} from '@/components/panels/rdf/rdfUtils';
import Dock from 'primevue/dock';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import {
  TripleEditorService,
  type TripleTransferObject,
} from '@/components/panels/rdf/tripleEditorService';
import {useErrorService} from '@/utility/errorServiceInstance';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';
import {useCurrentData} from '@/data/useDataLink';
import {isDark} from '@/components/panels/rdf/rdfUtils';
import {
  CY_LAYOUT,
  createCyStyle,
  isTypePredicate,
} from '@/components/panels/rdf/rdfVisualizerGraphStyle';
import {
  buildGraphElements,
  buildLiteralsForSubject,
  countNodes,
} from '@/components/panels/rdf/rdfVisualizerGraphElements';
import RdfVisualizerDialogs from '@/components/panels/rdf/RdfVisualizerDialogs.vue';
import RdfVisualizerSidebar from '@/components/panels/rdf/RdfVisualizerSidebar.vue';

const settings = useSettings();
const darkMode = isDark();
const showLargeGraphPrompt = ref(false);
const nodeCount = ref(0);
const isLoading = ref(false);
const graphLoaded = ref(false);
const physicsEnabled = ref(false);
const propertiesPanelVisible = ref(true);
const propertiesPanelSize = computed(() => (propertiesPanelVisible.value ? 28 : 0));
const propertiesPanelMinSize = computed(() => (propertiesPanelVisible.value ? 16 : 0));
const isRefreshingNode = ref(false);
const needsGraphRefresh = ref(false);
const refreshStack = ref<boolean[]>([]);
const deleteNodeDialog = ref(false);
const deletePropertyDialog = ref(false);
const renameNodeDialog = ref(false);
const renameNodeValue = ref('');
const propertyUpdateKey = ref(0);
const propertyToDelete = ref<RdfNodeLiteral | null>(null);

const emit = defineEmits<{
  (e: 'cancel-render'): void;
  (e: 'edit-triple', triple: TripleTransferObject): void;
  (e: 'add-node'): void;
}>();

const props = withDefaults(
  defineProps<{
    statements: $rdf.Statement[];
    readOnly?: boolean;
    dataIsUnparsable?: boolean;
    dataIsInJsonLd?: boolean;
  }>(),
  {
    readOnly: false,
    dataIsUnparsable: false,
    dataIsInJsonLd: true,
  }
);

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
    label: 'Zoom to Selected',
    icon: 'pi pi-arrow-down-left-and-arrow-up-right-to-center',
    disabled: !selectedNode.value,
    command: () => zoomToSelected(),
  },
  {
    label: physicsEnabled.value ? 'Stop' : 'Animate',
    icon: physicsEnabled.value ? 'pi pi-pause' : 'pi pi-play',
    command: () => togglePhysics(),
  },
  {
    label: 'Export Image',
    icon: 'pi pi-image',
    command: () => exportGraphImage(),
  },
  {
    label: propertiesPanelVisible.value ? 'Hide Properties' : 'Show Properties',
    icon: propertiesPanelVisible.value ? 'pi pi-times' : 'pi pi-info-circle',
    command: () => togglePropertiesPanel(),
  },
]);

const bottomDockItems = computed(() => [
  {
    label: 'Undo',
    icon: 'pi pi-undo',
    disabled: () => !useCurrentData().undoManager.canUndo.value,
    command: () => {
      pushGraphRefresh(true);
      useCurrentData().undoManager.undo();
    },
  },
  {
    label: 'Redo',
    icon: 'pi pi-refresh',
    disabled: () => !useCurrentData().undoManager.canRedo.value,
    command: () => {
      pushGraphRefresh(true);
      useCurrentData().undoManager.redo();
    },
  },
]);

const hasGraphError = computed(() => props.dataIsUnparsable || !props.dataIsInJsonLd);
const nodeSearchQuery = ref<{id: string; label: string} | string | null>('');

const allNodes = computed(() => {
  const ids = new Set<string>();
  for (const st of props.statements) {
    ids.add(st.subject.value);
  }
  return Array.from(ids).map(id => {
    const label = jsonLdContextManager.toPrefixed(id);
    return {
      id,
      label,
      idLower: id.toLowerCase(),
      labelLower: label.toLowerCase(),
    };
  });
});

const nodeSearchResults = computed(() => {
  const rawQuery =
    typeof nodeSearchQuery.value === 'string'
      ? nodeSearchQuery.value
      : nodeSearchQuery.value?.label ?? '';
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  return allNodes.value
    .filter(node => node.idLower.includes(query) || node.labelLower.includes(query))
    .slice(0, 8);
});

cytoscape.use(coseBilkent);
const selectedCyNode = ref<cytoscape.NodeSingular | null>(null);
const container = ref<HTMLDivElement | null>(null);
const selectedNode = ref<SelectedNodeData | null>(null);
const unsubscribeStore = ref<null | (() => void)>(null);

let cy: cytoscape.Core | null = null;

function togglePropertiesPanel() {
  propertiesPanelVisible.value = !propertiesPanelVisible.value;
}

function exportGraphImage() {
  if (!cy) return;
  const dataUrl = cy.png({
    bg: '#ffffff',
    full: false,
    scale: 2,
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `rdf-graph-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  link.click();
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

function zoomIn() {
  animateZoom(1.2, true);
}

function zoomOut() {
  animateZoom(1 / 1.2, false);
}

function zoomFit() {
  if (!cy) return;
  animateFit(cy.elements(), 30, 400);
}

function zoomToSelected() {
  if (!cy) return;

  const node = selectedCyNode.value ?? cy.nodes(':selected').first();
  if (!node || node.length === 0) return;

  animateFit(node, 80, 400);
}

function onNodeSearch(event: {query: string}) {
  nodeSearchQuery.value = event.query;
}

function clearNodeSearch() {
  nodeSearchQuery.value = '';
}

function selectNodeById(nodeId: string) {
  if (!cy) return;
  const node = cy.getElementById(nodeId);
  if (!node || node.length === 0) return;
  selectNode(node, node.data());
  animateFit(node, 80, 400);
}

function togglePhysics() {
  if (!cy) return;

  physicsEnabled.value = !physicsEnabled.value;

  if (physicsEnabled.value) {
    const layout = buildPhysicsLayout();
    layout!.on('layoutstop', () => {
      physicsEnabled.value = false;
    });
    layout!.run();
  }
}

function selectNode(node: any, nodeData: any) {
  clearSelectedNode();
  node.addClass('selected');
  selectedCyNode.value = node;
  selectedNode.value = toSelectedNodeData(nodeData);
  propertyUpdateKey.value++;
}

function deleteSelectedNode() {
  if (!selectedNode.value) return;
  deleteNodeDialog.value = true;
}

function editSelectedNode() {
  if (!selectedNode.value) return;
  renameNodeValue.value = selectedNode.value.id;
  renameNodeDialog.value = true;
}

function deleteProperty(lit: RdfNodeLiteral) {
  propertyToDelete.value = lit;
  deletePropertyDialog.value = true;
}

function confirmDeleteProperty() {
  const target = propertyToDelete.value;
  if (!target?.statement) {
    useErrorService().onError('Unable to delete property: missing source statement.');
    deletePropertyDialog.value = false;
    propertyToDelete.value = null;
    return;
  }

  const result = TripleEditorService.delete(target.statement);
  if (!result.success) {
    useErrorService().onError(result.errorMessage!);
    return;
  }

  refreshSelectedNodeFromStore();
  deletePropertyDialog.value = false;
  propertyToDelete.value = null;
}

function confirmDeleteNode() {
  if (!selectedNode.value) return;
  const subjectId = selectedNode.value.id;
  const result = rdfStoreManager.deleteStatementsBySubject(subjectId);
  if (!result.success) {
    useErrorService().onError(result.errorMessage!);
    return;
  }

  for (const statement of result.deleted) {
    jsonLdNodeManager.deleteStatement(statement);
  }

  clearSelectedNode();
  deleteNodeDialog.value = false;
  const updatedStatements = rdfStoreManager.statements.value;
  renderGraph(updatedStatements);
}

function confirmRenameNode() {
  if (!selectedNode.value) return;
  const oldId = selectedNode.value.id;
  const newId = renameNodeValue.value.trim();

  if (!newId) {
    useErrorService().onError('New node IRI cannot be empty.');
    return;
  }
  if (newId === oldId) {
    renameNodeDialog.value = false;
    return;
  }

  const result = TripleEditorService.renameSubjectNode(oldId, newId);
  if (!result.success) {
    useErrorService().onError(result.errorMessage);
    return;
  }

  renameNodeDialog.value = false;
  refreshAndSelectNode(newId);
}

function editProperty(lit: RdfNodeLiteral) {
  if (!selectedNode.value) return;
  const statement = lit.statement;
  const fallbackObject = lit.href ?? jsonLdContextManager.expandIRI(lit.value) ?? lit.value;
  const objectTermType =
    statement?.object.termType ?? (lit.isIRI ? RdfTermType.NamedNode : RdfTermType.Literal);
  const payload: TripleTransferObject = {
    subject: statement?.subject.value ?? selectedNode.value.id,
    subjectType: (statement?.subject.termType ?? RdfTermType.NamedNode) as RdfTermTypeString,
    predicate:
      statement?.predicate.value ?? jsonLdContextManager.expandIRI(lit.predicate) ?? lit.predicate,
    predicateType: (statement?.predicate.termType ?? RdfTermType.NamedNode) as RdfTermTypeString,
    object: statement?.object.value ?? fallbackObject,
    objectType: objectTermType as RdfTermTypeString,
    objectDatatype:
      statement?.object.termType === RdfTermType.Literal ? statement.object.datatype?.value : '',
    statement,
  };
  emit('edit-triple', payload);
}

function addPropertyToSelected() {
  if (!selectedNode.value) return;
  const payload: TripleTransferObject = {
    subject: selectedNode.value.id,
    subjectType: RdfTermType.NamedNode,
    predicate: '',
    predicateType: RdfTermType.NamedNode,
    object: '',
    objectType: RdfTermType.Literal,
    objectDatatype: '',
  };
  emit('edit-triple', payload);
}

function addNodeFromVisualizer() {
  emit('add-node');
}

function handlePropertyLinkClick(lit: RdfNodeLiteral, event: MouseEvent) {
  const iri = lit.href || jsonLdContextManager.iriHref(lit.value);
  if (!iri || !cy) return;
  const node = cy.getElementById(iri);
  if (!node || node.length === 0) return;
  event.preventDefault();
  cy.animate({
    fit: {
      eles: node,
      padding: 80,
    },
    duration: 400,
    easing: 'ease-in-out-cubic',
  });
}

function applyCyTheme() {
  if (!cy) return;
  cy.style(createCyStyle(darkMode.value));
  cy.resize();
}

function setupCytoscape(elements: cytoscape.ElementDefinition[]) {
  if (!container.value) return null;

  if (cy) {
    cy.destroy();
  }

  return cytoscape({
    container: container.value,
    elements,
    style: createCyStyle(darkMode.value),
    layout: CY_LAYOUT,
  });
}

function attachCytoscapeEvents(
  graph: cytoscape.Core,
  initialFit: () => void,
  beforeFinalizeLayout: () => boolean
) {
  enableGraphInteractions(graph);
  registerLayoutStop(graph, initialFit, beforeFinalizeLayout);
  registerNodeTap(graph);
  registerNodeDoubleTap(graph);
  registerCanvasTap(graph);
  registerEdgeTap(graph);
  registerEdgeHover(graph);
}

function renderGraph(statements: readonly $rdf.Statement[]) {
  if (!container.value) return;

  isLoading.value = true;
  let didInitialFit = false;
  let overlapRetryCount = 0;
  const elements = buildGraphElements(
    statements,
    jsonLdContextManager.toPrefixed,
    jsonLdContextManager.isIRI
  );

  const graph = setupCytoscape(elements);
  if (!graph) return;
  cy = graph;

  attachCytoscapeEvents(
    graph,
    () => {
      if (didInitialFit) return;
      didInitialFit = true;
      resizeAndFit(graph);
    },
    () => {
      if (overlapRetryCount > 0) return false;
      if (!hasOverlappingNodes(graph)) return false;

      overlapRetryCount++;
      const overlapRecoveryLayout: any = {
        ...CY_LAYOUT,
        animate: false,
        randomize: true,
        nodeRepulsion: 13000,
        idealEdgeLength: 260,
        avoidOverlapPadding: 80,
        numIter: 25000,
      };
      graph.layout(overlapRecoveryLayout).run();
      return true;
    }
  );
}

function animateZoom(factor: number, centerOnSelected: boolean) {
  if (!cy) return;
  cy.stop(true);
  const currentZoom = cy.zoom();
  const animationConfig: any = {
    zoom: currentZoom * factor,
    duration: 300,
    easing: 'ease-in-out-cubic',
  };
  if (centerOnSelected) {
    const selectedNodes = cy.nodes(':selected');
    if (selectedNodes.length > 0) {
      animationConfig.center = {eles: selectedNodes};
    }
  }
  cy.animate(animationConfig);
}

function animateFit(eles: cytoscape.Collection, padding: number, duration: number) {
  if (!cy) return;
  cy.animate({
    fit: {
      eles,
      padding,
    },
    duration,
    easing: 'ease-in-out-cubic',
  });
}

function buildPhysicsLayout() {
  if (!cy) return;
  const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);
  return cy.layout({
    name: 'cose-bilkent',
    animate: true,
    animationDuration: 1000,
    randomize: true,
    idealEdgeLength: randomInRange(160, 280),
    edgeElasticity: randomInRange(70, 140),
    gravity: randomInRange(70, 130),
    numIter: 15000,
  });
}

function toSelectedNodeData(nodeData: any): SelectedNodeData {
  return {
    id: nodeData.id,
    label: nodeData.label,
    literals: nodeData.literals,
  };
}

function isNamedNodeTerm(term: any): boolean {
  return term.termType !== RdfTermType.Literal;
}

function updateNodeData(subjectId: string) {
  if (!cy) return;
  const node = cy.getElementById(subjectId);
  if (!node || node.length === 0) return;
  const subjectStatements = rdfStoreManager.getStatementsBySubject(subjectId);
  if (subjectStatements.length === 0) return;
  const literals = buildLiteralsForSubject(
    subjectId,
    subjectStatements,
    jsonLdContextManager.toPrefixed,
    jsonLdContextManager.isIRI
  );
  node.data({
    ...node.data(),
    literals,
    hasLiterals: literals.length > 0,
    literalCount: literals.length,
  });
}

function pushGraphRefresh(needsFullGraphRefresh: boolean) {
  refreshStack.value.push(needsFullGraphRefresh);
  needsGraphRefresh.value = true;
}

function getSubjectIds(change: RdfChange): Set<string> {
  const ids = new Set<string>();
  const oldSubject = change.oldStatement?.subject.value;
  const newSubject = change.newStatement?.subject.value;
  if (oldSubject) ids.add(oldSubject);
  if (newSubject) ids.add(newSubject);
  return ids;
}

function isStructuralChange(change: RdfChange): boolean {
  const oldSt = change.oldStatement;
  const newSt = change.newStatement;

  if (!oldSt || !newSt) {
    const target = newSt?.object ?? oldSt?.object;
    return Boolean(target && isNamedNodeTerm(target));
  }

  if (oldSt.subject.value !== newSt.subject.value) return true;

  const oldObject = oldSt.object;
  const newObject = newSt.object;
  if (oldObject.termType !== newObject.termType) return true;
  if (isNamedNodeTerm(oldObject) && oldObject.value !== newObject.value) return true;

  if (oldSt.predicate.value !== newSt.predicate.value) {
    return isNamedNodeTerm(oldObject);
  }

  return false;
}

function hasEdgeDiffForSubject(subjectId: string): boolean {
  if (!cy) return true;
  const currentEdges = cy.edges(`[source = "${subjectId}"]`);
  const currentKeys = new Set<string>();
  currentEdges.forEach(edge => {
    const source = edge.data('source');
    const target = edge.data('target');
    const predicate = edge.data('predicateIRI');
    currentKeys.add(`${source}|${predicate}|${target}`);
  });

  const subjects = new Set<string>(rdfStoreManager.statements.value.map(st => st.subject.value));
  const storeKeys = new Set<string>();
  for (const st of rdfStoreManager.statements.value) {
    if (st.subject.value !== subjectId) continue;
    if (st.object.termType === RdfTermType.Literal) continue;
    if (isTypePredicate(st.predicate.value)) continue;
    if (!subjects.has(st.object.value)) continue;
    storeKeys.add(`${st.subject.value}|${st.predicate.value}|${st.object.value}`);
  }
  if (currentKeys.size !== storeKeys.size) return true;
  for (const key of currentKeys) {
    if (!storeKeys.has(key)) return true;
  }
  return false;
}

async function refreshSelectedNodeFromStore() {
  if (!selectedNode.value) return;
  isRefreshingNode.value = true;
  await nextTick();
  const subjectId = selectedNode.value.id;
  const needsRefresh = hasEdgeDiffForSubject(subjectId);
  const subjectStatements = rdfStoreManager.getStatementsBySubject(subjectId);
  const literals = buildLiteralsForSubject(
    subjectId,
    subjectStatements,
    jsonLdContextManager.toPrefixed,
    jsonLdContextManager.isIRI
  );
  selectedNode.value = {
    ...selectedNode.value,
    literals,
  };
  propertyUpdateKey.value++;

  updateNodeData(subjectId);
  if (needsRefresh) {
    renderGraph(rdfStoreManager.statements.value);
    if (cy) {
      const node = cy.getElementById(subjectId);
      if (node && node.length > 0) {
        selectNode(node, node.data());
      }
    }
  }
  isRefreshingNode.value = false;
}

function refreshAndSelectNode(nodeId: string) {
  renderGraph(rdfStoreManager.statements.value);
  if (!cy) return;
  const node = cy.getElementById(nodeId);
  if (!node || node.length === 0) return;
  selectNode(node, node.data());
}

function handleRdfChange(change: RdfChange) {
  const subjectIds = getSubjectIds(change);
  const selectedId = selectedNode.value?.id;
  if (selectedId && subjectIds.has(selectedId)) {
    const remaining = rdfStoreManager.getStatementsBySubject(selectedId);
    if (remaining.length === 0) {
      clearSelectedNode();
      renderGraph(rdfStoreManager.statements.value);
    } else {
      refreshSelectedNodeFromStore();
    }
  } else {
    subjectIds.forEach(id => updateNodeData(id));
  }

  if (isStructuralChange(change)) {
    const toReselect = selectedNode.value?.id;
    renderGraph(rdfStoreManager.statements.value);
    if (toReselect && cy) {
      const node = cy.getElementById(toReselect);
      if (node && node.length > 0) {
        selectNode(node, node.data());
      } else {
        clearSelectedNode();
      }
    }
  }
}

defineExpose({refreshSelectedNodeFromStore, refreshAndSelectNode});

function clearSelectedNode() {
  if (selectedCyNode.value) {
    selectedCyNode.value.removeClass('selected');
  }
  selectedCyNode.value = null;
  selectedNode.value = null;
}

function enableGraphInteractions(graph: cytoscape.Core) {
  graph.userPanningEnabled(true);
  graph.userZoomingEnabled(true);
  graph.boxSelectionEnabled(true);
}

function registerLayoutStop(
  graph: cytoscape.Core,
  initialFit: () => void,
  beforeFinalizeLayout: () => boolean
) {
  graph.on('layoutstop', () => {
    if (beforeFinalizeLayout()) {
      return;
    }
    isLoading.value = false;
    graphLoaded.value = true;
    initialFit();
  });
}

function hasOverlappingNodes(graph: cytoscape.Core): boolean {
  const nodes = graph.nodes();
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (!a) continue;
    const aBox = a.boundingBox({includeLabels: true, includeOverlays: false});
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      if (!b) continue;
      const bBox = b.boundingBox({includeLabels: true, includeOverlays: false});
      const overlaps =
        aBox.x1 < bBox.x2 && aBox.x2 > bBox.x1 && aBox.y1 < bBox.y2 && aBox.y2 > bBox.y1;
      if (overlaps) return true;
    }
  }
  return false;
}

function registerNodeTap(graph: cytoscape.Core) {
  graph.on('tap', 'node', event => {
    const node = event.target;
    const nodeData = node.data();
    pulseNode(node);
    selectNode(node, nodeData);
  });
}

function registerNodeDoubleTap(graph: cytoscape.Core) {
  graph.on('dblclick', 'node', event => {
    const node = event.target;
    const nodeData = node.data();
    selectNode(node, nodeData);
    zoomToSelected();
  });
}

function registerCanvasTap(graph: cytoscape.Core) {
  graph.on('tap', event => {
    if (event.target === graph) {
      clearSelectedNode();
    }
  });
}

function registerEdgeTap(graph: cytoscape.Core) {
  graph.on('tap', 'edge', event => {
    const edge = event.target;
    const predicateIRI = edge.data('predicateIRI');
    pulseEdge(edge);
    const href = jsonLdContextManager.iriHref(predicateIRI);
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  });
}

function registerEdgeHover(graph: cytoscape.Core) {
  graph.on('mouseover', 'edge', () => {
    if (container.value) {
      container.value.style.cursor = 'pointer';
    }
  });
  graph.on('mouseout', 'edge', () => {
    if (container.value) {
      container.value.style.cursor = 'default';
    }
  });
}

function pulseNode(node: cytoscape.NodeSingular) {
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
}

function pulseEdge(edge: cytoscape.EdgeSingular) {
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
}

function resizeAndFit(graph: cytoscape.Core) {
  graph.resize();
  graph.fit(undefined, 30);
}

onMounted(() => {
  nodeCount.value = countNodes(props.statements);

  if (nodeCount.value > settings.value.rdf.maximumNodesToVisualize) {
    showLargeGraphPrompt.value = true;
  } else {
    if (!hasGraphError.value) {
      renderGraph(props.statements);
    }
  }

  unsubscribeStore.value = rdfStoreManager.onChange(handleRdfChange);

  const resizeObserver = new ResizeObserver(() => {
    if (cy) {
      cy.resize();
      cy.fit(undefined, 30);
    }
  });

  onUnmounted(() => {
    if (unsubscribeStore.value) {
      unsubscribeStore.value();
      unsubscribeStore.value = null;
    }
    resizeObserver.disconnect();
    if (cy) {
      cy.destroy();
      cy = null;
    }
  });
});

watch(
  () => darkMode.value,
  () => {
    applyCyTheme();
  }
);

watch(
  () => rdfStoreManager.statements.value,
  () => {
    refreshSelectedNodeFromStore();
  }
);

watch(
  () => hasGraphError.value,
  hasError => {
    if (hasError) {
      isLoading.value = false;
      refreshStack.value = [];
      needsGraphRefresh.value = false;
      return;
    }
    if (!container.value) return;
    if (showLargeGraphPrompt.value) return;
    renderGraph(props.statements);
  }
);

watch(
  () => props.statements,
  statements => {
    if (!needsGraphRefresh.value) return;
    if (!container.value) return;
    if (showLargeGraphPrompt.value) return;
    if (hasGraphError.value) return;
    const needsFullGraphRefresh = refreshStack.value.pop();
    needsGraphRefresh.value = refreshStack.value.length > 0;
    if (needsFullGraphRefresh === undefined) {
      return;
    }
    if (needsFullGraphRefresh) {
      renderGraph(statements);
      return;
    }
    void refreshSelectedNodeFromStore();
  }
);
</script>
<style scoped>
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

.graph-frozen .graph-container,
.graph-frozen .graph-dock {
  pointer-events: none;
  opacity: 0.6;
  filter: grayscale(0.2);
}

.graph-freeze-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  pointer-events: none;
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

.graph-dock :deep(.p-dock-list-container) {
  background: transparent !important;
  border: none !important ;
}

.graph-dock {
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  z-index: 60;
}

.graph-dock-bottom {
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 60;
}

.graph-dock-bottom :deep(.p-dock-list-container) {
  background: transparent !important;
  border: none !important ;
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

.graph-dock-bottom :deep(.p-dock) {
  background: transparent;
}

.graph-dock-bottom :deep(.p-dock-list) {
  display: flex;
  flex-direction: row;
  gap: 10px;
  padding: 0;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
}

.rdf-splitter {
  width: 100%;
  height: 100%;
}
</style>
