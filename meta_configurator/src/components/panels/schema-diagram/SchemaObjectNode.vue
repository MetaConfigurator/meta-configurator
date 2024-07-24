<script setup lang="ts">
import {
  SchemaElementData,
  SchemaObjectNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import SchemaObjectAttribute from '@/components/panels/schema-diagram/SchemaObjectAttribute.vue';
import type {Path} from '@/utility/path';
import InputText from 'primevue/inputtext';
import {Position, Handle} from '@vue-flow/core';
import {useSettings} from '@/settings/useSettings';
import {computed, ref} from 'vue';

const props = defineProps<{
  data: SchemaObjectNodeData;
  targetPosition?: Position;
  sourcePosition?: Position;
  selectedData?: SchemaElementData;
}>();

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
  (e: 'zoom_into_element', path: Path): void;
  (e: 'update_object_name', objectData: SchemaElementData, oldName: string, newName: string): void;
}>();

const objectName = ref(props.data.name);
const isNameEditable = computed(() => {
  return useSettings().schemaDiagram.editMode && props.data.hasUserDefinedName;
});

function clickedNode() {
  emit('select_element', props.data.absolutePath);
}

function doubleClickedNode() {
  emit('zoom_into_element', props.data.absolutePath);
}

function clickedAttribute(path: Path) {
  emit('select_element', path);
}

function updateObjectName() {
  const newName = objectName.value.trim();
  if (newName.length == 0) {
    return;
  }
  emit('update_object_name', props.data, props.data.name, newName);
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

    <b v-if="!isNameEditable">
      {{ props.data.name }}
    </b>

    <InputText
      v-if="isNameEditable"
      type="text"
      v-model="objectName"
      @blur="updateObjectName"
      @keydown.stop
      @keyup.enter="updateObjectName" />

    <hr />
    <SchemaObjectAttribute
      v-if="useSettings().schemaDiagram.showAttributes"
      v-for="attribute in props.data!.attributes"
      :data="attribute!"
      :selected-data="props.selectedData"
      @select_element="clickedAttribute"></SchemaObjectAttribute>
    <Handle
      id="main"
      type="source"
      :position="props.sourcePosition!"
      class="vue-flow__handle"
      style="bottom: 10px"></Handle>
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
  font-size: 12px;
  border: none;
  height: unset;
  width: unset;
  background: transparent;
}
</style>
