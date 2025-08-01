<script setup lang="ts">
import type {ComputedRef, Ref} from 'vue';
import {computed, nextTick, onMounted, ref, watch} from 'vue';

import {getNodesInside, useVueFlow, VueFlow} from '@vue-flow/core';
import SchemaObjectNode from '@/components/panels/schema-diagram/SchemaObjectNode.vue';
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {constructSchemaGraph} from '@/schema/graph-representation/schemaGraphConstructor';
import {SessionMode} from '@/store/sessionMode';
import type {Path} from '@/utility/path';
import {useLayout} from './useLayout';
import {
  type Edge,
  type Node,
  SchemaEnumNodeData,
  SchemaNodeData,
  SchemaObjectAttributeData,
  SchemaObjectNodeData,
  SchemaElementData,
} from '@/schema/graph-representation/schemaGraphTypes';
import SchemaEnumNode from '@/components/panels/schema-diagram/SchemaEnumNode.vue';
import {useSettings} from '@/settings/useSettings';
import {findBestMatchingData, findBestMatchingNode} from '@/schema/graph-representation/graphUtils';
import {findForwardConnectedNodesAndEdges} from '@/schema/graph-representation/findConnectedNodes';
import {
  updateNodeData,
  wasNodeAddedOrEdgesChanged,
} from '@/schema/graph-representation/updateGraph';
import CurrentPathBreadcrump from '@/components/panels/shared-components/CurrentPathBreadcrump.vue';
import {
  applyNewType,
  type AttributeTypeChoice,
  collectTypeChoices,
} from '@/schema/graph-representation/typeUtils';
import Button from 'primevue/button';
import {findAvailableSchemaId} from '@/schema/schemaReadingUtils';
import {
  addSchemaEnum,
  addSchemaObject,
  createIdentifierForExtractedElement,
  extractInlinedSchemaElement,
} from '@/schema/schemaManipulationUtils';
import {schemaGraphToVueFlowGraph} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import {deleteSchemaElement} from '@/utility/deleteUtils';
import {replacePropertyNameUtils} from '@/utility/renameUtils';

const emit = defineEmits<{
  (e: 'update_current_path', path: Path): void;
  (e: 'select_element', path: Path): void;
  (e: 'update_data', path: Path, newValue: any): void;
}>();

const vueFlowInstance = useVueFlow();
const {layout} = useLayout();
const {fitView} = useVueFlow();

const settings = useSettings();

const schemaData = getDataForMode(SessionMode.SchemaEditor);
const schemaSession = getSessionForMode(SessionMode.SchemaEditor);
const dataSchema = getSchemaForMode(SessionMode.DataEditor);
const schemaSchema = getSchemaForMode(SessionMode.SchemaEditor);

const forceFitView = ref(true);

const activeNodes: Ref<Node[]> = ref<Node[]>([]);
const activeEdges: Ref<Edge[]> = ref<Edge[]>([]);

const graphDirection = computed(() => {
  // note that having edges from left ro right will usually lead to a more vertical graph, because usually it is
  // not very deeply nested, but there exist many nodes on the same levels
  return settings.value.schemaDiagram.vertical ? 'LR' : 'TB';
});

const selectedNode: Ref<Node | undefined> = ref(undefined);
const selectedData: Ref<SchemaElementData | undefined> = ref(undefined);

const currentRootNodePath: Ref<Path> = ref([]);

const typeChoices: ComputedRef<AttributeTypeChoice[]> = computed(() => {
  return collectTypeChoices(
    activeNodes.value
      .filter(
        node =>
          node.data.getNodeType() === 'schemaobject' || node.data.getNodeType() === 'schemaenum'
      )
      .map(node => node.data as SchemaObjectNodeData | SchemaEnumNodeData)
  );
});

watch(getSchemaForMode(SessionMode.DataEditor).schemaPreprocessed, () => {
  updateGraph();
});

watch(schemaSession.currentPath, () => {
  updateGraph();
});

onMounted(() => {
  updateGraph();

  nextTick(() => {
    fitView();
  });
});

// scroll to the current selected element when it changes
watch(
  schemaSession.currentSelectedElement,
  () => {
    const absolutePath = schemaSession.currentSelectedElement.value;
    fitViewForElementByPath(absolutePath);
  },
  {deep: true}
);

function fitViewForElementByPath(path: Path) {
  const bestMatchingNode = findBestMatchingNode(activeNodes.value, path);
  const previousBestMatchingNode = selectedNode.value;
  selectedNode.value = bestMatchingNode;
  selectedData.value = findBestMatchingData(bestMatchingNode?.data, path);
  if (bestMatchingNode) {
    if (
      (previousBestMatchingNode && previousBestMatchingNode.id === bestMatchingNode.id) ||
      !settings.value.schemaDiagram.moveViewToSelectedElement
    ) {
      // if the node is already within the viewport, do not move the view
      if (areNodesAlreadyWithinViewport([bestMatchingNode])) {
        return;
      }
      if (path.length == 0) {
        return;
      }
    }

    fitViewForNodes([bestMatchingNode]);
  }
}

function fitViewForNodes(nodes: Node[]) {
  nextTick(() => {
    fitView({
      nodes: nodes.map(node => node.id),
      duration: 1000,
      padding: 1,
      maxZoom: settings.value.schemaDiagram.automaticZoomMaxValue,
      minZoom: settings.value.schemaDiagram.automaticZoomMinValue,
    });
  });
}

function areNodesAlreadyWithinViewport(nodes: Node[]) {
  const state = vueFlowInstance;
  const allGraphNodes = state.nodes.value;
  const relevantGraphNodes = allGraphNodes.filter(node => nodes.some(n => n.id === node.id));
  const nodesInside = getNodesInside(
    relevantGraphNodes,
    {
      x: 0,
      y: 0,
      width: state.dimensions.value.width,
      height: state.dimensions.value.height,
    },
    state.viewport.value,
    false
  );
  return nodesInside.length == relevantGraphNodes.length;
}

function updateGraph(forceRebuild: boolean = false) {
  const schema = dataSchema.schemaPreprocessed.value;
  const graph = constructSchemaGraph(schema, settings.value.schemaDiagram.mergeAllOfs);
  let graphNeedsLayouting = forceRebuild;

  const vueFlowGraph = schemaGraphToVueFlowGraph(graph, settings.value.schemaDiagram.vertical);
  if (wasNodeAddedOrEdgesChanged(activeNodes.value, vueFlowGraph.nodes)) {
    // node was added -> it is needed to update whole graph
    activeNodes.value = vueFlowGraph.nodes;
    activeEdges.value = vueFlowGraph.edges;
    currentRootNodePath.value = [];
    graphNeedsLayouting = true;
  } else {
    // only data updated or nodes removed
    const nodesToRemove = updateNodeData(activeNodes.value, vueFlowGraph.nodes);
    activeNodes.value = activeNodes.value.filter(node => !nodesToRemove.includes(node.id));
  }

  // if not on root level but current path is set: show only subgraph
  const currentPath: Path = schemaSession.currentPath.value;
  if (currentPath.length > 0) {
    updateToSubgraph(currentPath);
  }

  if (graphNeedsLayouting || forceRebuild) {
    layoutGraph(graphDirection.value, false);
  }

  if (schemaSession.currentSelectedElement.value) {
    nextTick(() => {
      fitViewForElementByPath(schemaSession.currentSelectedElement.value);
    });
  }
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

async function layoutGraph(direction: string, nodesInitialised: boolean) {
  activeNodes.value = layout(activeNodes.value, activeEdges.value, direction);
  if (nodesInitialised && activeNodes.value.length > 0) {
    if (forceFitView.value) {
      nextTick(() => {
        fitView();
      });
      forceFitView.value = false;
    } else {
      nextTick(() => {
        if (schemaSession.currentSelectedElement.value) {
          fitViewForElementByPath(schemaSession.currentSelectedElement.value);
        }
      });
    }
  }
}

function selectElement(path: Path) {
  if (schemaData.dataAt(path) != undefined) {
    if (schemaSession.currentSelectedElement.value != path) {
      // if the currently selected element differs: update the current selected element
      emit('select_element', path);
    } else if (selectedNode.value == undefined) {
      // if the currently selected element is the same, but the selected node is not set, then fit the view
      fitViewForElementByPath(path);
    }
  }
}

function updateCurrentPath(path: Path) {
  emit('update_current_path', path);
}

function updateData(absolutePath: Path, newValue: any) {
  emit('update_data', absolutePath, newValue);
}

function updateObjectOrEnumName(objectData: SchemaElementData, oldName: string, newName: string) {
  // change name in node before replacing name in schema. Otherwise, when the schema change is detected, it would also compute
  // that a new node was added (because different name) and then rebuild whole graph.
  objectData.name = newName;

  objectData.absolutePath = replacePropertyNameUtils(
    objectData.absolutePath,
    oldName,
    newName,
    schemaData.data.value,
    schemaSchema.schemaWrapper.value,
    updateData
  );

  selectElement(objectData.absolutePath);

  // TODO: when renaming happens, also force update in the GUI
}

function extractInlinedElement(elementData: SchemaObjectNodeData | SchemaEnumNodeData) {
  const newIdentifier = createIdentifierForExtractedElement(
    elementData.name,
    elementData.title,
    elementData.fallbackDisplayName
  );
  const newElementId = extractInlinedSchemaElement(
    elementData.absolutePath,
    schemaData,
    newIdentifier
  );
  elementData.absolutePath = newElementId;
  selectElement(newElementId);
}

function updateAttributeName(attributeData: SchemaNodeData, oldName: string, newName: string) {
  // change name in node before replacing name in schema. Otherwise, when the schema change is detected, it would also compute
  // that a new node was added (because different name) and then rebuild whole graph.
  attributeData.name = newName;

  attributeData.absolutePath = replacePropertyNameUtils(
    attributeData.absolutePath,
    oldName,
    newName,
    schemaData.data.value,
    schemaSchema.schemaWrapper.value,
    updateData
  );

  selectElement(attributeData.absolutePath);

  // TODO: when renaming happens, also force update in the GUI
}

function updateAttributeType(
  attributeData: SchemaObjectAttributeData,
  newType: AttributeTypeChoice
) {
  //attributeData.typeDescription = newType.label;
  const attributeSchema = structuredClone(schemaData.dataAt(attributeData.absolutePath));
  applyNewType(attributeSchema, newType.schema);
  schemaData.setDataAt(attributeData.absolutePath, attributeSchema);
}

function deleteElement(objectData: SchemaElementData) {
  deleteSchemaElement(schemaData, objectData.absolutePath);
}

function addAttribute(objectData: SchemaElementData) {
  const attributePath = findAvailableSchemaId(
    schemaData,
    [...objectData.absolutePath, 'properties'],
    'property'
  );
  schemaData.setDataAt(attributePath, {
    type: 'string',
  });
  // todo: make selection of attribute work
  selectElement(attributePath);
}

function updateEnumValues(enumData: SchemaEnumNodeData, newValues: string[]) {
  const enumSchema = structuredClone(schemaData.dataAt(enumData.absolutePath));

  // this turns Proxy(Array) into raw Array. Otherwise, when again updating the enum values, it will throw an error
  // when trying to create structured clone, because cannot do for a Proxy
  enumSchema.enum = JSON.parse(JSON.stringify(newValues));
  schemaData.setDataAt(enumData.absolutePath, enumSchema);
}

function addObject() {
  const objectPath = addSchemaObject(schemaData);
  selectElement(objectPath);
}

function addEnum() {
  const enumPath = addSchemaEnum(schemaData);
  selectElement(enumPath);
}

function unselectElement() {
  selectedNode.value = undefined;
  selectedData.value = undefined;
  schemaSession.currentSelectedElement.value = [];
}
</script>

<template>
  <div class="layout-flow">
    <VueFlow
      :nodes="activeNodes"
      :edges="activeEdges"
      @nodes-initialized="layoutGraph(graphDirection, true)"
      @click="unselectElement()"
      fit-view-on-init
      :max-zoom="4"
      :min-zoom="0.1">
      <div class="controls">
        <CurrentPathBreadcrump
          :session-mode="SessionMode.SchemaEditor"
          :path="schemaSession.currentPath.value"
          root-name="document root"
          @click.stop
          @update:path="updateCurrentPath"></CurrentPathBreadcrump>

        <Button label="Rebuild Graph" @click="() => updateGraph(true)" class="options-element" />
        <Button label="Add Object" @click="addObject" class="main-options-element" />
        <Button label="Add Enum" @click="addEnum" class="main-options-element" />
      </div>

      <template #node-schemaobject="props">
        <SchemaObjectNode
          :data="props.data"
          @select_element="selectElement"
          @zoom_into_element="updateCurrentPath"
          @update_object_name="updateObjectOrEnumName"
          @update_attribute_name="updateAttributeName"
          @update_attribute_type="updateAttributeType"
          @delete_element="deleteElement"
          @add_attribute="addAttribute"
          @extract_inlined_element="extractInlinedElement"
          :source-position="props.sourcePosition"
          :target-position="props.targetPosition"
          :selected-data="selectedData"
          :type-choices="typeChoices" />
      </template>
      <template #node-schemaenum="props">
        <SchemaEnumNode
          :data="props.data"
          @select_element="selectElement"
          @update_enum_name="updateObjectOrEnumName"
          @update_enum_values="updateEnumValues"
          @delete_element="deleteElement"
          @extract_inlined_element="extractInlinedElement"
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

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .layout-flow {
    background-color: #121212;
  }
}

.controls {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 4;
  padding: 16px 8px; /* More vertical padding */
  display: flex;
  gap: 8px; /* Space between buttons */
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
.main-options-element {
  font-size: 11px;
  position: relative;
  border: 4px;
  padding: 6px;
  margin-left: 4px;
}
</style>
