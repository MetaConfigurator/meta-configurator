<script setup lang="ts">
import {
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
  (e: 'zoom_into_element', path: Path): void;
}>();

function clickedNode() {
  emit('select_element', props.data.absolutePath);
}

function doubleClickedNode() {
  emit('zoom_into_element', props.data.absolutePath);
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
    @click="clickedNode()"
    @dblclick="doubleClickedNode()">
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
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 4px;
  border: 1px solid #ddd;
  color: #2e3d49;
  background: linear-gradient(135deg, #fafcff 0%, #ffffff 100%);
}

.vue-flow__node-schemaobject:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}
</style>
