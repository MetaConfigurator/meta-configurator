<script setup lang="ts">
import {
  SchemaElementData,
  SchemaExternalReferenceNodeData,
  SchemaObjectAttributeData,
  SchemaObjectNodeData,
} from '@/schema/graph-representation/schemaGraphTypes';
import SchemaObjectAttribute from '@/components/panels/schema-diagram/SchemaObjectAttribute.vue';
import type {Path} from '@/utility/path';
import InputText from 'primevue/inputtext';
import {Position, Handle} from '@vue-flow/core';
import {useSettings} from '@/settings/useSettings';
import {ref} from 'vue';
import type {AttributeTypeChoice} from '@/schema/graph-representation/typeUtils';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {isSubSchemaDefinedInDefinitions} from '@/schema/schemaReadingUtils';
import {getObjectDisplayName} from '@/schema/graph-representation/schemaGraphConstructor';

const props = defineProps<{
  data: SchemaExternalReferenceNodeData;
  targetPosition?: Position;
  sourcePosition?: Position;
  selectedData?: SchemaElementData;
}>();

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
  (e: 'delete_element', objectData: SchemaElementData): void;
  (e: 'resolve_external_reference', objectData: SchemaExternalReferenceNodeData): void;
  (
    e: 'update_external_reference_value',
    objectData: SchemaExternalReferenceNodeData,
    newValue: string
  ): void;
}>();

const refValue = ref(props.data.reference || '');

const settings = useSettings();

function isReferenceEditable() {
  return isHighlighted() && settings.value.schemaDiagram.editMode;
}

function clickedNode() {
  emit('select_element', props.data.absolutePath);
}

function updateReferenceValue() {
  const newName = refValue.value.trim();
  if (newName.length == 0) {
    return;
  }
  if (!props.data.reference) {
    throw new Error(
      'External reference value is not defined. This should not happen. Please report this issue.'
    );
  }
  emit('update_external_reference_value', props.data, props.data.reference, newName);
}

function deleteExternalReference() {
  deleteElement(props.data);
}

function deleteElement(data: SchemaElementData) {
  emit('delete_element', data);
}

function isHighlighted() {
  return props.selectedData && props.selectedData == props.data;
}

function resolveExternalReference() {
  emit('resolve_external_reference', props.data);
}
</script>
<template>
  <div
    :class="{
      'bg-yellow-100': isHighlighted(),
      'vue-flow__node-externalreference': !isHighlighted(),
    }"
    @click="clickedNode()"
    @click.stop>
    <Handle type="target" :position="props.targetPosition!" class="vue-flow__handle"></Handle>

    <div v-if="!isReferenceEditable()" class="vue-flow-ref-label">
      <b>{{ props.data.reference }}</b>
    </div>

    <div v-else class="vue-flow-ref-edit">
      <InputText
        type="text"
        class="vue-flow-ref-inputtext"
        v-model="refValue"
        @blur="updateReferenceValue"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @keydown.stop
        @keyup.enter="updateReferenceValue" />
      <Button
        class="vue-flow-ref-button"
        size="small"
        v-tooltip.bottom="'Resolve external reference and inline content in this file.'"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @click="_ => resolveExternalReference()">
        <FontAwesomeIcon :icon="'fa-file-import fa-solid'" />
      </Button>
    </div>

    <Handle
      id="main"
      type="source"
      :position="props.sourcePosition!"
      class="vue-flow__handle"
      :style="[props.sourcePosition == Position.Right ? {top: '14px'} : {}]"></Handle>
  </div>
</template>

<style>
.vue-flow__node-externalreference {
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 4px;
  border: 1px solid #1e88e5;
  color: #2e3d49;
  background: linear-gradient(135deg, #fafcff 0%, #ffffff 100%);
  display: flex;
  align-items: center;
}

/* When not highlighted: limit width and truncate text */
.vue-flow-ref-label {
  max-width: 150px; /* Adjust to desired constraint */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* When highlighted: input grows full width beside the button */
.vue-flow-ref-edit {
  display: flex;
  align-items: center;
  width: 100%;
}

.vue-flow-ref-inputtext {
  flex: 1;
  font-size: 14px;
  font-weight: bold;
  height: 26px;
  min-width: 0; /* Ensures flex shrink works properly */
}

.vue-flow-ref-button {
  font-size: 11px;
  border: none;
  background: none;
  padding: 0;
  margin-left: 5px;
  color: black;
}
</style>
