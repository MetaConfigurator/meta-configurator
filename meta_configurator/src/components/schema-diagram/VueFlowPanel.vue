<script setup lang="ts">
import {nextTick, onMounted, ref, watch} from 'vue';

import {useVueFlow, VueFlow} from '@vue-flow/core';
import SchemaObjectNode from '@/components/schema-diagram/SchemaObjectNode.vue';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {constructSchemaGraph} from '@/components/schema-diagram/schemaGraphConstructor';
import {SessionMode} from '@/store/sessionMode';
import {Path} from '@/utility/path';
import {useLayout} from './useLayout';
import type {Edge, Node} from '@/components/schema-diagram/schemaDiagramTypes';
import SchemaEnumNode from '@/components/schema-diagram/SchemaEnumNode.vue';

const props = defineProps<{
  currentPath: Path;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path_to_add: Path): void;
  (e: 'select_path', path: Path): void;
}>();

const schemaData = getDataForMode(SessionMode.SchemaEditor);

const currentNodes = ref<Node[]>([]);
const currentEdges = ref<Edge[]>([]);

watch(getSchemaForMode(SessionMode.DataEditor).schemaPreprocessed, () => {
  updateGraph();

  nextTick(() => {
    layoutGraph('TB');
  });
});

onMounted(() => {
  updateGraph();
});

function updateGraph() {
  const schema = getSchemaForMode(SessionMode.DataEditor);
  const graph = constructSchemaGraph(schema.schemaPreprocessed.value);
  const vueFlowGraph = graph.toVueFlowGraph();
  currentNodes.value = vueFlowGraph.nodes;
  currentEdges.value = vueFlowGraph.edges;
}

const {layout} = useLayout();
const {fitView} = useVueFlow();

async function layoutGraph(direction) {
  currentNodes.value = layout(currentNodes.value, currentEdges.value, direction);
  nextTick(() => {
    fitView();
  });
}

function clickedNodeOrAttribute(path: Path) {
  if (schemaData.dataAt(path) != undefined) {
    emit('select_path', path);
  }
}
</script>

<template>
  <div class="layout-flow">
    <VueFlow
      :nodes="currentNodes"
      :edges="currentEdges"
      @nodes-initialized="layoutGraph('TB')"
      :max-zoom="4"
      :min-zoom="0.1">
      <template #node-schemaobject="props">
        <SchemaObjectNode :data="props.data" @select_element="clickedNodeOrAttribute" />
      </template>
      <template #node-schemaenum="props">
        <SchemaEnumNode :data="props.data" @select_element="clickedNodeOrAttribute" />
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
</style>
