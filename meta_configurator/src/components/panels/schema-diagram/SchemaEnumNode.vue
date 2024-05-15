<script setup lang="ts">
import {
  SchemaElementData,
  SchemaEnumNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import {getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import type {Path} from '@/utility/path';
import {Handle, Position} from '@vue-flow/core';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  data: SchemaEnumNodeData;
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

function isHighlighted() {
  return props.selectedData && props.selectedData == props.data;
}
</script>

<template>
  <div
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaenum': !isHighlighted}"
    @click="clickedNode()">
    <Handle type="target" :position="props.targetPosition!" class="vue-flow__handle"></Handle>
    <p>&lt;enumeration&gt;</p>
    <!--small><i>{{ props.data.absolutePath }}</i></small-->
    <b>{{ props.data.name }}</b>
    <hr />
    <p v-if="useSettings().schemaDiagram.showEnumValues" v-for="value in props.data!.values">
      {{ value }}
    </p>
    <Handle type="target" :position="props.sourcePosition!" class="vue-flow__handle"></Handle>
  </div>
</template>

<style>
.vue-flow__node-schemaenum {
  background: lightcyan;
  color: black;

  border: 1px solid lightcyan;
  border-radius: 4px;
  box-shadow: 0 0 0 3px lightcyan;
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
