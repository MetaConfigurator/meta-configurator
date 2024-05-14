<script setup lang="ts">
import {
  Node,
  SchemaElementData,
  SchemaObjectNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import SchemaObjectAttribute from '@/components/panels/schema-diagram/SchemaObjectAttribute.vue';
import type {Path} from '@/utility/path';
import {Position, Handle} from '@vue-flow/core';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  data: SchemaObjectNodeData;
  targetPosition?: Position;
  sourcePosition?: Position;
  selectedData?: SchemaElementData;
}>();

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
}>();

function clickedNode() {
  emit('select_element', props.data.absolutePath);
}

function clickedAttribute(path: Path) {
  emit('select_element', path);
}

function isHighlighted() {
  return props.selectedData && props.selectedData == props.data;
}
</script>

<template>
  <div
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaobject': !isHighlighted}"
    @click="clickedNode()">
    <Handle type="target" :position="props.targetPosition!" class="vue-flow__handle"></Handle>
    <!--small><i>{{ props.data.absolutePath }}</i></small-->
    <b>{{ props.data.name }}</b>
    <hr />
    <SchemaObjectAttribute
      v-if="useSettings().schemaDiagram.showAttributes"
      v-for="attribute in props.data!.attributes"
      :data="attribute!"
      :selected-data="props.selectedData"
      @select_element="clickedAttribute"></SchemaObjectAttribute>
    <Handle type="source" :position="props.sourcePosition!" class="vue-flow__handle"></Handle>
  </div>
</template>

<style>
.vue-flow__node-schemaobject {
  background: lightblue;
  color: black;

  border: 1px solid lightblue;
  border-radius: 4px;
  box-shadow: 0 0 0 3px lightblue;
  padding: 0px;
}

.vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}
</style>
