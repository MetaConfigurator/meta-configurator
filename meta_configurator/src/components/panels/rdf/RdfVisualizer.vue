<template>
  <div style="width: 100%; height: 100%; display: flex; position: relative">
    <Dialog
      v-model:visible="showLargeGraphPrompt"
      header="Large graph detected"
      modal
      :closable="false">
      <Message severity="secondary" variant="simple" :closable="false">
        <template #default>
          This graph contains <strong>{{ nodeCount }}</strong> nodes. Rendering may be slow for
          graphs with more than <strong>{{ settings.rdf.maximumNodesToVisualize }}</strong> nodes.
          <br />
          You can adjust this value in the settings. Do you want to continue?
        </template>
      </Message>
      <template #footer>
        <Button label="No" icon="pi pi-times" text @click="confirmRender(false)" />
        <Button label="Yes" icon="pi pi-check" text @click="confirmRender(true)" />
      </template>
    </Dialog>
    <Dialog v-model:visible="deletePropertyDialog" header="Confirm" modal>
      <div class="flex items-center gap-4">
        <i class="pi pi-exclamation-triangle !text-3xl" />
        <span>Are you sure you want to delete the selected property?</span>
      </div>
      <template #footer>
        <Button
          label="No"
          icon="pi pi-times"
          text
          @click="deletePropertyDialog = false"
          severity="secondary"
          variant="text" />
        <Button
          label="Yes"
          icon="pi pi-check"
          text
          @click="confirmDeleteProperty"
          severity="danger" />
      </template>
    </Dialog>
    <Dialog v-model:visible="deleteNodeDialog" header="Confirm" modal>
      <div class="flex items-center gap-4">
        <i class="pi pi-exclamation-triangle !text-3xl" />
        <span>Are you sure you want to delete the selected node?</span>
      </div>
      <template #footer>
        <Button
          label="No"
          icon="pi pi-times"
          text
          @click="deleteNodeDialog = false"
          severity="secondary"
          variant="text" />
        <Button label="Yes" icon="pi pi-check" text @click="confirmDeleteNode" severity="danger" />
      </template>
    </Dialog>
    <Splitter class="rdf-splitter" :gutter-size="propertiesPanelVisible ? 8 : 0">
      <SplitterPanel class="graph-panel">
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
      </SplitterPanel>
      <SplitterPanel
        v-if="propertiesPanelVisible"
        :size="propertiesPanelSize"
        :minSize="propertiesPanelMinSize">
        <ScrollPanel class="properties-scroll">
          <RdfVisualizerPropertiesView
            class="properties-view"
            :selectedNode="selectedNode"
            :readOnly="props.readOnly"
            :isRefreshingNode="isRefreshingNode"
            :propertyUpdateKey="propertyUpdateKey"
            :iriHref="iriHref"
            :isIRI="isIRI"
            :isLinkableIRI="isLinkableIRI"
            @delete-node="deleteSelectedNode"
            @delete-property="deleteProperty"
            @edit-property="editProperty"
            @add-property="addPropertyToSelected"
            @add-node="addNodeFromVisualizer"
            @property-link-click="handlePropertyLinkClick" />
        </ScrollPanel>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import ScrollPanel from 'primevue/scrollpanel';
import {ref, computed, onMounted, onUnmounted, watch, nextTick} from 'vue';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type * as $rdf from 'rdflib';
import {rdfStoreManager, type RdfChange} from '@/components/panels/rdf/rdfStoreManager';
import {PREDICATE_ALIAS_MAP} from '@/components/panels/rdf/jsonLdParser';
import {useSettings} from '@/settings/useSettings';
import {RdfTermType} from '@/components/panels/rdf/rdfUtils';
import Dock from 'primevue/dock';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import {isDarkMode} from '@/utility/darkModeUtils';
import {
  TripleEditorService,
  type TripleTransferObject,
} from '@/components/panels/rdf/tripleEditorService';
import {useErrorService} from '@/utility/errorServiceInstance';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import RdfVisualizerPropertiesView from '@/components/panels/rdf/RdfVisualizerPropertiesView.vue';

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

const settings = useSettings();
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
const deleteNodeDialog = ref(false);
const deletePropertyDialog = ref(false);
const propertyUpdateKey = ref(0);
const propertyToDelete = ref<{
  predicate: string;
  value: string;
  isIRI: boolean;
  href?: string;
  statement?: $rdf.Statement;
} | null>(null);

const emit = defineEmits<{
  (e: 'cancel-render'): void;
  (e: 'edit-triple', triple: TripleTransferObject): void;
  (e: 'add-node'): void;
}>();

const props = withDefaults(
  defineProps<{
    statements: $rdf.Statement[];
    readOnly?: boolean;
  }>(),
  {
    readOnly: false,
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

function togglePhysics() {
  if (!cy) return;

  physicsEnabled.value = !physicsEnabled.value;

  if (physicsEnabled.value) {
    const layout = buildPhysicsLayout();
    layout.on('layoutstop', () => {
      physicsEnabled.value = false;
    });
    layout.run();
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

function deleteProperty(lit: {predicate: string; value: string; isIRI: boolean}) {
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

  for (const st of result.deleted) {
    jsonLdNodeManager.deleteStatement(st);
  }

  clearSelectedNode();
  deleteNodeDialog.value = false;
  const updatedStatements = rdfStoreManager.statements.value;
  renderGraph(updatedStatements);
}

function editProperty(lit: {
  predicate: string;
  value: string;
  isIRI: boolean;
  href?: string;
  statement?: $rdf.Statement;
}) {
  if (!selectedNode.value) return;
  const statement = lit.statement;
  const fallbackObject = lit.href ?? expandIRI(lit.value) ?? lit.value;
  const payload: TripleTransferObject = {
    subject: statement?.subject.value ?? selectedNode.value.id,
    subjectType: statement?.subject.termType ?? RdfTermType.NamedNode,
    predicate: statement?.predicate.value ?? expandIRI(lit.predicate) ?? lit.predicate,
    predicateType: statement?.predicate.termType ?? RdfTermType.NamedNode,
    object: statement?.object.value ?? fallbackObject,
    objectType:
      statement?.object.termType ?? (lit.isIRI ? RdfTermType.NamedNode : RdfTermType.Literal),
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

function handlePropertyLinkClick(
  lit: {predicate: string; value: string; isIRI: boolean; href?: string},
  event: MouseEvent
) {
  const iri = lit.href || iriHref(lit.value);
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
  return expandIRI(value) !== null;
}

function iriHref(value: string): string | null {
  return expandIRI(value);
}

const TYPE_PREDICATES = [
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'https://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'rdf:type',
  '@type',
];

function createCyStyle(): cytoscape.StylesheetCSS[] {
  const edgeLabelColor = isDarkMode.value ? '#f8fafc' : '#111827';
  return [
    {
      selector: 'node',
      css: {
        'background-color': '#4299e1',
        'border-width': '2',
        'border-color': '#2c5282',
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'min-width': '60',
        'min-height': '30',
        color: '#fff',
        'font-size': '12px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        width: 'label',
        height: '30',
        padding: '15px',
        shape: 'roundrectangle',
        'transition-property': 'background-color, border-color, border-width',
        'transition-duration': 300,
      },
    },
    {
      selector: 'node.selected',
      css: {
        'background-color': '#22c55e',
        'border-width': '4',
        'border-color': '#15803d',
      },
    },
    {
      selector: 'node[hasLiterals]',
      css: {
        'border-color': '#f6ad55',
        'border-width': '3',
      },
    },
    {
      selector: 'edge',
      css: {
        width: '2',
        'line-color': '#a0aec0',
        'target-arrow-color': '#a0aec0',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'control-point-step-size': 100,
        label: 'data(label)',
        color: edgeLabelColor,
        'font-size': '12px',
        'text-rotation': 'autorotate',
        'text-background-opacity': 0,
        'text-margin-y': -12,
        'transition-property': 'line-color, width',
        'transition-duration': 300,
      },
    },
  ];
}

const CY_LAYOUT: cytoscape.LayoutOptions = {
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
};

function isTypePredicate(predicate: string): boolean {
  return (
    TYPE_PREDICATES.includes(predicate) ||
    predicate.endsWith('#type') ||
    predicate.endsWith('/type')
  );
}

function buildGraphElements(statements: readonly $rdf.Statement[]) {
  const nodesMap = new Map<
    string,
    {
      literals?: Array<{
        predicate: string;
        value: string;
        isIRI: boolean;
        statement?: $rdf.Statement;
      }>;
    }
  >();
  const edges: any[] = [];
  const existingSubjects = new Set<string>(statements.map(st => st.subject.value));

  for (const st of statements) {
    const s = st.subject.value;
    const p = st.predicate.value;
    const o = st.object.value;

    ensureNode(nodesMap, s);

    if (st.object.termType === RdfTermType.Literal) {
      addLiteral(nodesMap, s, p, o, undefined, st);
      continue;
    }

    addLiteral(nodesMap, s, p, toPrefixed(o), o, st);

    if (isTypePredicate(p) || !existingSubjects.has(o)) {
      continue;
    }

    ensureNode(nodesMap, o);
    edges.push(createEdge(s, p, o));
  }

  const nodes = Array.from(nodesMap.entries()).map(([id, data]) => createNode(id, data));

  return [...nodes, ...edges];
}

function setupCytoscape(elements: cytoscape.ElementDefinition[]) {
  if (!container.value) return null;

  if (cy) {
    cy.destroy();
  }

  return cytoscape({
    container: container.value,
    elements,
    style: createCyStyle(),
    layout: CY_LAYOUT,
  });
}

function attachCytoscapeEvents(graph: cytoscape.Core, initialFit: () => void) {
  enableGraphInteractions(graph);
  registerLayoutStop(graph, initialFit);
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
  const elements = buildGraphElements(statements);

  const graph = setupCytoscape(elements);
  if (!graph) return;
  cy = graph;

  attachCytoscapeEvents(graph, () => {
    if (didInitialFit) return;
    didInitialFit = true;
    resizeAndFit(graph);
  });
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

function buildLiteralsForSubject(
  subjectId: string,
  statements: readonly $rdf.Statement[]
): Array<{
  predicate: string;
  value: string;
  isIRI: boolean;
  href?: string;
  statement?: $rdf.Statement;
}> {
  const literals: Array<{
    predicate: string;
    value: string;
    isIRI: boolean;
    href?: string;
    statement?: $rdf.Statement;
  }> = [];

  for (const st of statements) {
    if (st.subject.value !== subjectId) continue;
    const p = st.predicate.value;
    const o = st.object.value;
    if (st.object.termType === RdfTermType.Literal) {
      literals.push({
        predicate: getPredicateAlias(p),
        value: o,
        isIRI: isIRI(o),
        statement: st,
      });
    } else {
      literals.push({
        predicate: getPredicateAlias(p),
        value: toPrefixed(o),
        isIRI: true,
        href: o,
        statement: st,
      });
    }
  }

  return literals;
}

function updateNodeData(subjectId: string) {
  if (!cy) return;
  const node = cy.getElementById(subjectId);
  if (!node || node.length === 0) return;
  const subjectStatements = rdfStoreManager.getStatementsBySubject(subjectId);
  if (subjectStatements.length === 0) return;
  const literals = buildLiteralsForSubject(subjectId, subjectStatements);
  node.data({
    ...node.data(),
    literals,
    hasLiterals: literals.length > 0,
    literalCount: literals.length,
  });
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
  const literals = buildLiteralsForSubject(subjectId, subjectStatements);
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

function ensureNode(
  nodesMap: Map<
    string,
    {
      literals?: Array<{
        predicate: string;
        value: string;
        isIRI: boolean;
        statement?: $rdf.Statement;
      }>;
    }
  >,
  id: string
) {
  if (!nodesMap.has(id)) {
    nodesMap.set(id, {literals: []});
  }
}

function addLiteral(
  nodesMap: Map<
    string,
    {
      literals?: Array<{
        predicate: string;
        value: string;
        isIRI: boolean;
        href?: string;
        statement?: $rdf.Statement;
      }>;
    }
  >,
  subjectId: string,
  predicate: string,
  value: string,
  href?: string,
  statement?: $rdf.Statement
) {
  nodesMap.get(subjectId)!.literals!.push({
    predicate: getPredicateAlias(predicate),
    value,
    isIRI: Boolean(href) || isIRI(value),
    href,
    statement,
  });
}

function createEdge(source: string, predicate: string, target: string) {
  return {
    data: {
      id: `${source}-${predicate}-${target}`,
      source,
      target,
      label: getPredicateAlias(predicate),
      predicateIRI: predicate,
    },
  };
}

function createNode(
  id: string,
  data: {
    literals?: Array<{
      predicate: string;
      value: string;
      isIRI: boolean;
      statement?: $rdf.Statement;
    }>;
  }
) {
  return {
    data: {
      id,
      label: toPrefixed(id),
      hasLiterals: data.literals && data.literals.length > 0,
      literalCount: data.literals?.length || 0,
      literals: data.literals,
    },
  };
}

function enableGraphInteractions(graph: cytoscape.Core) {
  graph.userPanningEnabled(true);
  graph.userZoomingEnabled(true);
  graph.boxSelectionEnabled(true);
}

function registerLayoutStop(graph: cytoscape.Core, initialFit: () => void) {
  graph.on('layoutstop', () => {
    isLoading.value = false;
    graphLoaded.value = true;
    initialFit();
  });
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
    const href = iriHref(predicateIRI);
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
    renderGraph(props.statements);
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
  () => rdfStoreManager.statements.value,
  () => {
    refreshSelectedNodeFromStore();
  }
);

watch(
  () => props.statements,
  statements => {
    if (!needsGraphRefresh.value) return;
    if (!container.value) return;
    if (showLargeGraphPrompt.value) return;
    needsGraphRefresh.value = false;
    renderGraph(statements);
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
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
}

.rdf-splitter {
  width: 100%;
  height: 100%;
}

.properties-scroll {
  width: 100%;
  height: 100%;
}

.properties-scroll :deep(.p-scrollpanel-content) {
  display: flex;
  flex-direction: column;
}

.properties-view {
  flex: 1;
  min-height: 0;
}

@media (prefers-color-scheme: dark) {
  .graph-container {
    background: #1a202c;
  }
}
</style>
