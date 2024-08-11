<script setup lang="ts">
import type {ComputedRef, Ref} from 'vue';
import {computed, nextTick, onMounted, ref, watch} from 'vue';

import {useVueFlow, VueFlow} from '@vue-flow/core';
import SchemaObjectNode from '@/components/panels/schema-diagram/SchemaObjectNode.vue';
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {constructSchemaGraph} from '@/components/panels/schema-diagram/schemaGraphConstructor';
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
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import {SchemaElementData} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import SchemaEnumNode from '@/components/panels/schema-diagram/SchemaEnumNode.vue';
import {useSettings} from '@/settings/useSettings';
import {
  findBestMatchingData,
  findBestMatchingNode,
} from '@/components/panels/schema-diagram/schemaDiagramHelper';
import {findForwardConnectedNodesAndEdges} from '@/components/panels/schema-diagram/findConnectedNodes';
import {updateNodeData, wasNodeAdded} from '@/components/panels/schema-diagram/updateGraph';
import CurrentPathBreadcrump from '@/components/panels/shared-components/CurrentPathBreadcrump.vue';
import DiagramOptionsPanel from '@/components/panels/schema-diagram/DiagramOptionsPanel.vue';
import {replacePropertyNameUtils} from '@/components/panels/shared-components/renameUtils';
import {
  applyNewType,
  type AttributeTypeChoice,
  collectTypeChoices,
} from '@/components/panels/schema-diagram/typeUtils';
import Button from 'primevue/button';
import {pathToJsonPointer} from '@/utility/pathUtils';
import {dataAt} from "@/utility/resolveDataAtPath";

const emit = defineEmits<{
  (e: 'update_current_path', path: Path): void;
  (e: 'select_element', path: Path): void;
  (e: 'update_data', path: Path, newValue: any): void;
}>();

const schemaData = getDataForMode(SessionMode.SchemaEditor);
const schemaSession = getSessionForMode(SessionMode.SchemaEditor);
const dataSchema = getSchemaForMode(SessionMode.DataEditor);
const schemaSchema = getSchemaForMode(SessionMode.SchemaEditor);
const currentPath: Ref<Path> = computed(() => schemaSession.currentPath.value);

const forceFitView = ref(true);

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
  selectedNode.value = bestMatchingNode;
  selectedData.value = findBestMatchingData(bestMatchingNode, path);
  if (bestMatchingNode && useSettings().schemaDiagram.moveViewToSelectedElement) {
    fitViewForNodes([bestMatchingNode]);
  }
}

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

  const vueFlowGraph = graph.toVueFlowGraph(useSettings().schemaDiagram.vertical);
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

  if (graphNeedsLayouting && forceRebuild) {
    layoutGraph(graphDirection.value, false);
  }

  if (!graphNeedsLayouting && schemaSession.currentSelectedElement.value) {
    fitViewForElementByPath(schemaSession.currentSelectedElement.value);
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

const {layout} = useLayout();
const {fitView} = useVueFlow();

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
    emit('select_element', path);
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

  selectElement(objectData.absolutePath)

  // TODO: when renaming happens, also force update in the GUI
}

function extractInlinedElement(elementData: SchemaObjectNodeData|SchemaEnumNodeData) {
  const oldElementPath = elementData.absolutePath;
  const dataAtPath = dataAt(oldElementPath, schemaData.data.value)
  const newElementId = findAvailableId(['$defs'], elementData.name, true)
  schemaData.setDataAt(newElementId, dataAtPath)
  const referenceToNewElement = '#' + pathToJsonPointer(newElementId);
  schemaData.setDataAt(oldElementPath, {
    $ref: referenceToNewElement,
  })
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

  selectElement(attributeData.absolutePath)

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
  schemaData.removeDataAt(objectData.absolutePath);
}

function addAttribute(objectData: SchemaElementData) {
  const attributePath = findAvailableId([...objectData.absolutePath, 'properties'], 'property');
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

function findAvailableId(path: Path, prefix: string, preferWithoutNumber: boolean = false): Path {
  let num: number = 1;
  let success = false;
  while (num <= 100) {
    const id = (num == 1 && preferWithoutNumber) ? prefix :  prefix + num;
    const fullPath = [...path, id];
    success = schemaData.dataAt(fullPath) === undefined;
    if (success) {
      return fullPath;
    } else {
      num++;
    }
  }
  throw Error('Could not find available id, tried until ' + prefix + num + '.');
}

function addObject() {
  const rawData = schemaData.data.value;

  // set type of root element to object if not done yet
  if (rawData.type !== 'object') {
    rawData.type = 'object';
  }

  const objectPath = findAvailableId(['$defs'], 'object');
  schemaData.setDataAt(objectPath, {
    type: 'object',
    properties: {
      property1: {
        type: 'string',
      },
    },
  });

  // make connection from root element to new node
  const objectName = objectPath[objectPath.length - 1];
  if (rawData.properties === undefined || objectName! in rawData.properties) {
    const referenceToNewObject = '#' + pathToJsonPointer(objectPath);
    schemaData.setDataAt(['properties', objectName], {
      $ref: referenceToNewObject,
    });
  }

  selectElement(objectPath);
}

function addEnum() {
  const enumPath = findAvailableId(['$defs'], 'enum');
  schemaData.setDataAt(enumPath, {
    type: 'string',
    enum: ['APPLE', 'BANANA', 'ORANGE'],
  });
  selectElement(enumPath);
}
</script>

<template>
  <div class="layout-flow">
    <VueFlow
      :nodes="activeNodes"
      :edges="activeEdges"
      @nodes-initialized="layoutGraph(graphDirection, true)"
      fit-view-on-init
      :max-zoom="4"
      :min-zoom="0.1">
      <div class="controls">
        <DiagramOptionsPanel @rebuild_graph="updateGraph(true)" @fit_view="fitView()" />

        <CurrentPathBreadcrump
          :session-mode="SessionMode.SchemaEditor"
          :path="schemaSession.currentPath.value"
          root-name="document root"
          @update:path="updateCurrentPath"></CurrentPathBreadcrump>

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
.main-options-element {
  font-size: 11px;
  position: relative;
  border: 4px;
  padding: 6px;
  margin-left: 4px;
}
</style>
