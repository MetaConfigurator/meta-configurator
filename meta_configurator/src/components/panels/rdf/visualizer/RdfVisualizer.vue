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

    <Splitter style="width: 100%; height: 100%" :gutter-size="propertiesPanelVisible ? 8 : 0">
      <SplitterPanel>
        <RdfVisualizerGraphPanel
          :readOnly="props.readOnly"
          :hasGraphError="hasGraphError"
          :graphLoaded="graphLoaded"
          :isLoading="isLoading"
          :dockItems="dockItems"
          :bottomDockItems="bottomDockItems"
          @container-change="onGraphContainerChange" />
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
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue';
import type cytoscape from 'cytoscape';
import type * as $rdf from 'rdflib';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import {rdfStoreManager, type RdfChange} from '@/components/panels/rdf/rdfStoreManager';
import {useSettings} from '@/settings/useSettings';
import {
  type RdfNodeLiteral,
  type SelectedNodeData,
  RdfTermType,
  type RdfTermTypeString,
  isDark,
} from '@/components/panels/rdf/rdfUtils';
import {
  TripleEditorService,
  type TripleTransferObject,
} from '@/components/panels/rdf/tripleEditorService';
import {useErrorService} from '@/utility/errorServiceInstance';
import {jsonLdNodeManager} from '@/components/panels/rdf/jsonLdNodeManager';
import {jsonLdContextManager} from '@/components/panels/rdf/jsonLdContextManager';
import {useCurrentData} from '@/data/useDataLink';
import {isTypePredicate} from '@/components/panels/rdf/visualizer/rdfVisualizerGraphStyle';
import {
  buildLiteralsForSubject,
  countNodes,
} from '@/components/panels/rdf/visualizer/rdfVisualizerGraphElements';
import {useRdfVisualizerGraph} from '@/components/panels/rdf/visualizer/useRdfVisualizerGraph';
import RdfVisualizerDialogs from '@/components/panels/rdf/visualizer/RdfVisualizerDialogs.vue';
import RdfVisualizerSidebar from '@/components/panels/rdf/visualizer/RdfVisualizerSidebar.vue';
import RdfVisualizerGraphPanel from '@/components/panels/rdf/visualizer/RdfVisualizerGraphPanel.vue';

const settings = useSettings();
const darkMode = isDark();
const showLargeGraphPrompt = ref(false);
const nodeCount = ref(0);
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
const selectedCyNode = ref<cytoscape.NodeSingular | null>(null);
const selectedNode = ref<SelectedNodeData | null>(null);
const nodeSearchQuery = ref<{id: string; label: string} | string | null>('');
const unsubscribeStore = ref<null | (() => void)>(null);
const graphResizeObserver = ref<ResizeObserver | null>(null);

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

const {
  container,
  cy,
  isLoading,
  graphLoaded,
  physicsEnabled,
  applyCyTheme,
  exportGraphImage,
  renderGraph,
  zoomIn,
  zoomOut,
  zoomFit,
  zoomToSelected: zoomToSelectedGraph,
  selectNodeById: selectGraphNodeById,
  togglePhysics,
  focusNodeById,
  startResizeObserver,
  destroyGraph,
} = useRdfVisualizerGraph({
  toPrefixed: jsonLdContextManager.toPrefixed,
  isIRI: jsonLdContextManager.isIRI,
  onNodeSelected: (node, nodeData) => {
    selectNode(node, nodeData);
  },
  onCanvasTap: () => {
    clearSelectedNode();
  },
  onEdgeTap: predicateIri => {
    const href = jsonLdContextManager.iriHref(predicateIri);
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  },
});

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

function togglePropertiesPanel() {
  propertiesPanelVisible.value = !propertiesPanelVisible.value;
}

function onGraphContainerChange(element: HTMLDivElement | null) {
  container.value = element;
  if (element && !graphResizeObserver.value) {
    graphResizeObserver.value = startResizeObserver();
  }
  void nextTick(() => {
    requestRenderGraph();
  });
}

function requestRenderGraph() {
  if (!container.value) return;
  if (showLargeGraphPrompt.value) return;
  if (hasGraphError.value) return;
  renderGraph(props.statements);
}

function confirmRender(allow: boolean) {
  showLargeGraphPrompt.value = false;

  if (!allow) {
    emit('cancel-render');
    destroyGraph();
    return;
  }

  renderGraph(props.statements);
}

function zoomToSelected() {
  zoomToSelectedGraph(selectedCyNode.value);
}

function onNodeSearch(event: {query: string}) {
  nodeSearchQuery.value = event.query;
}

function clearNodeSearch() {
  nodeSearchQuery.value = '';
}

function selectNodeById(nodeId: string) {
  selectGraphNodeById(nodeId);
}

function selectNode(node: cytoscape.NodeSingular, nodeData: any) {
  clearSelectedNode();
  node.addClass('selected');
  selectedCyNode.value = node;
  selectedNode.value = {
    id: nodeData.id,
    label: nodeData.label,
    literals: nodeData.literals,
  };
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
  renderGraph(rdfStoreManager.statements.value);
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
  if (!iri) return;

  if (cy.value?.getElementById(iri)?.length) {
    event.preventDefault();
    event.stopPropagation();
    selectGraphNodeById(iri);
    return;
  }

  focusNodeById(iri);
}

function updateNodeData(subjectId: string) {
  if (!cy.value) return;
  const node = cy.value.getElementById(subjectId);
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

function isNamedNodeTerm(term: any): boolean {
  return term.termType !== RdfTermType.Literal;
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
  if (!cy.value) return true;
  const currentEdges = cy.value.edges(`[source = "${subjectId}"]`);
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
    if (cy.value) {
      const node = cy.value.getElementById(subjectId);
      if (node && node.length > 0) {
        selectNode(node, node.data());
      }
    }
  }
  isRefreshingNode.value = false;
}

function refreshAndSelectNode(nodeId: string) {
  renderGraph(rdfStoreManager.statements.value);
  if (!cy.value) return;
  const node = cy.value.getElementById(nodeId);
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
    if (toReselect && cy.value) {
      const node = cy.value.getElementById(toReselect);
      if (node && node.length > 0) {
        selectNode(node, node.data());
      } else {
        clearSelectedNode();
      }
    }
  }
}

function clearSelectedNode() {
  if (selectedCyNode.value) {
    selectedCyNode.value.removeClass('selected');
  }
  selectedCyNode.value = null;
  selectedNode.value = null;
}

onMounted(() => {
  nodeCount.value = countNodes(props.statements);

  if (nodeCount.value > settings.value.rdf.maximumNodesToVisualize) {
    showLargeGraphPrompt.value = true;
  } else {
    requestRenderGraph();
  }

  unsubscribeStore.value = rdfStoreManager.onChange(handleRdfChange);
});

onUnmounted(() => {
  if (unsubscribeStore.value) {
    unsubscribeStore.value();
    unsubscribeStore.value = null;
  }
  graphResizeObserver.value?.disconnect();
  graphResizeObserver.value = null;
  destroyGraph();
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
    requestRenderGraph();
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

defineExpose({refreshSelectedNodeFromStore, refreshAndSelectNode});
</script>
