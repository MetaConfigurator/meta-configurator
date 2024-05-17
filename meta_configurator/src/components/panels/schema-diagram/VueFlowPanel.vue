<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue';
import type {Ref} from 'vue';

import {useVueFlow, VueFlow} from '@vue-flow/core';
import Divider from 'primevue/divider';
import SchemaObjectNode from '@/components/panels/schema-diagram/SchemaObjectNode.vue';
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {constructSchemaGraph} from '@/components/panels/schema-diagram/schemaGraphConstructor';
import {SessionMode} from '@/store/sessionMode';
import type {Path} from '@/utility/path';
import {useLayout} from './useLayout';
import type {Edge, Node} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import SchemaEnumNode from '@/components/panels/schema-diagram/SchemaEnumNode.vue';
import {useSettings} from '@/settings/useSettings';
import {
  findBestMatchingData,
  findBestMatchingNode,
} from '@/components/panels/schema-diagram/schemaDiagramHelper';
import {SchemaElementData} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import {findForwardConnectedNodesAndEdges} from '@/components/panels/schema-diagram/findConnectedNodes';
import {updateNodeData, wasNodeAdded} from '@/components/panels/schema-diagram/updateGraph';
import CurrentPathBreadcrump from '@/components/panels/shared-components/CurrentPathBreadcrump.vue';
import DiagramOptionsPanel from '@/components/panels/schema-diagram/DiagramOptionsPanel.vue';

const emit = defineEmits<{
  (e: 'update_current_path', path: Path): void;
  (e: 'select_path', path: Path): void;
}>();

const schemaData = getDataForMode(SessionMode.SchemaEditor);
const schemaSession = getSessionForMode(SessionMode.SchemaEditor);
const dataSchema = getSchemaForMode(SessionMode.DataEditor);

const activeNodes: Ref<Node[]> = ref<Node[]>([]);
const activeEdges: Ref<Edge[]> = ref<Edge[]>([]);

const graphDirection = computed(() => {
  // note that having edges from left ro right will usually lead to a more vertical graph, because usually it is
  // not very deeply nested, but there exist many nodes on the same levels
  return useSettings().schemaDiagram.vertical ? 'LR' : 'TB';
});

const selectedNode: Ref<Node | undefined> = ref(undefined);
const selectedData: Ref<SchemaElementData | undefined> = ref(undefined);

const currentRootNodePath: Ref<Path> = ref([]);

watch(getSchemaForMode(SessionMode.DataEditor).schemaPreprocessed, () => {
  updateGraph();
});

watch(schemaSession.currentPath, () => {
  updateGraph();
});

onMounted(() => {
  updateGraph();
});

// scroll to the current selected element when it changes
watch(
  schemaSession.currentSelectedElement,
  () => {
    const absolutePath = schemaSession.currentSelectedElement.value;
    const bestMatchingNode = findBestMatchingNode(activeNodes.value, absolutePath);
    selectedNode.value = bestMatchingNode;
    selectedData.value = findBestMatchingData(bestMatchingNode, absolutePath);
    if (bestMatchingNode && useSettings().schemaDiagram.moveViewToSelectedElement) {
      fitViewForNodes([bestMatchingNode]);
    }
  },
  {deep: true}
);

function fitViewForCurrentlySelectedElement(otherwiseAll: boolean = true) {
  if (selectedNode.value) {
    fitViewForNodes([selectedNode.value]);
  } else if (otherwiseAll) {
    fitViewForNodes(activeNodes.value);
  }
}

function fitViewForNodes(nodes: Node[]) {
  nextTick(() => {
    fitView({
      nodes: nodes.map(node => node.id),
      duration: 1000,
      padding: 1,
      maxZoom: useSettings().schemaDiagram.automaticZoomMaxValue,
      minZoom: useSettings().schemaDiagram.automaticZoomMinValue,
    });
  });
}

function updateGraph(forceRebuild: boolean = false) {
  const schema = dataSchema.schemaPreprocessed.value;
  const graph = constructSchemaGraph(schema);
  let graphNeedsLayouting = forceRebuild;

  const vueFlowGraph = graph.toVueFlowGraph();
  if (wasNodeAdded(activeNodes.value, vueFlowGraph.nodes)) {
    // node was added -> it is needed to update whole graph
    activeNodes.value = vueFlowGraph.nodes;
    activeEdges.value = vueFlowGraph.edges;
    currentRootNodePath.value = [];
    graphNeedsLayouting = true;
  } else {
    // only data updated or nodes removed
    const nodesToRemove = updateNodeData(activeNodes.value, vueFlowGraph.nodes);
    activeNodes.value = activeNodes.value.filter(node => !nodesToRemove.includes(node.id));
    // we still update edges, because they might have changed
    activeEdges.value = vueFlowGraph.edges;
  }

  // if not on root level but current path is set: show only subgraph
  const currentPath: Path = schemaSession.currentPath.value;
  if (currentPath.length > 0) {
    updateToSubgraph(currentPath);
  }

  if (graphNeedsLayouting) {
    nextTick(() => {
      layoutGraph(graphDirection.value);
    });
  }

  fitViewForCurrentlySelectedElement(true);
}

function updateToSubgraph(path: Path) {
  const bestMatchingNode = findBestMatchingNode(activeNodes.value, path);
  if (bestMatchingNode) {
    const [currentNodes, currentEdges] = findForwardConnectedNodesAndEdges(
      activeNodes.value,
      activeEdges.value,
      bestMatchingNode
    );
    activeNodes.value = currentNodes;
    activeEdges.value = currentEdges;
    currentRootNodePath.value = bestMatchingNode.data.absolutePath;
  }
}

const {layout} = useLayout();
const {fitView} = useVueFlow();

async function layoutGraph(direction: string) {
  activeNodes.value = layout(activeNodes.value, activeEdges.value, direction);
  nextTick(() => {
    fitView();
  });
}

function selectElement(path: Path) {
  if (schemaData.dataAt(path) != undefined) {
    emit('select_path', path);
  }
}

function updateCurrentPath(path: Path) {
  emit('update_current_path', path);
}
</script>

<template>
  <div class="layout-flow">
    <VueFlow
      :nodes="activeNodes"
      :edges="activeEdges"
      @nodes-initialized="layoutGraph(graphDirection)"
      fit-view-on-init
      :max-zoom="4"
      :min-zoom="0.1">
      <div class="controls">
        <DiagramOptionsPanel
          @rebuild_graph="updateGraph(true)"
          @fit_view="fitViewForCurrentlySelectedElement" />

        <CurrentPathBreadcrump
          :path="schemaSession.currentPath.value"
          root-name="document root"
          @update:path="updateCurrentPath"></CurrentPathBreadcrump>
      </div>

      <template #node-schemaobject="props">
        <SchemaObjectNode
          :data="props.data"
          @select_element="selectElement"
          @zoom_into_element="updateCurrentPath"
          :source-position="props.sourcePosition"
          :target-position="props.targetPosition"
          :selected-data="selectedData" />
      </template>
      <template #node-schemaenum="props">
        <SchemaEnumNode
          :data="props.data"
          @select_element="selectElement"
          :source-position="props.sourcePosition"
          :target-position="props.targetPosition"
          :selected-data="selectedData" />
      </template>
    </VueFlow>
  </div>
</template>

<style>
.layout-flow {
  background-color: white;
  height: 100%;
  width: 100%;
}

.controls {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 4;
  background-color: lightgray;
  padding: 8px;
}
.controls .label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.controls .label input {
  cursor: pointer;
}
</style>
