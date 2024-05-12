<script setup lang="ts">
import {nextTick, onMounted, ref, watch} from 'vue';

import {VueFlow, useVueFlow} from '@vue-flow/core';
import SchemaObjectNode from '@/components/schema-diagram/SchemaObjectNode.vue';
import {getSchemaForMode} from '@/data/useDataLink';
import {constructSchemaGraph} from '@/components/schema-diagram/schemaGraphConstructor';
import {SessionMode} from '@/store/sessionMode';
import {Path} from '@/utility/path';
import {useLayout} from './useLayout';
import type {Edge, Node} from '@/components/schema-diagram/schemaDiagramTypes';
import SchemaEnumNode from '@/components/schema-diagram/SchemaEnumNode.vue';

const props = defineProps<{
  sessionMode: SessionMode;
  currentPath: Path;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path_to_add: Path): void;
  (e: 'select_path', path: Path): void;
}>();

const currentNodes = ref<Node[]>([]);
const currentEdges = ref<Edge[]>([]);

watch(getSchemaForMode(props.sessionMode).schemaPreprocessed, () => {
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
</script>

<template>
  <div class="layout-flow">
    <VueFlow :nodes="currentNodes" :edges="currentEdges" @nodes-initialized="layoutGraph('TB')">
      <template #node-schemaobject="props">
        <SchemaObjectNode :data="props.data" />
      </template>
      <template #node-schemaenum="props">
        <SchemaEnumNode :data="props.data" />
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
