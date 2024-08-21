<script setup lang="ts">
import {
  SchemaElementData,
  SchemaEnumNodeData,
  SchemaObjectNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import type {Path} from '@/utility/path';
import {Handle, Position} from '@vue-flow/core';
import {useSettings} from '@/settings/useSettings';
import {type Ref, ref} from 'vue';
import InputText from 'primevue/inputtext';
import {pathToString} from '@/utility/pathUtils';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

const props = defineProps<{
  data: SchemaEnumNodeData;
  targetPosition?: Position;
  sourcePosition?: Position;
  selectedData?: SchemaElementData;
}>();

const enumValues: Ref<string[]> = ref(props.data.values.slice());

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
  (e: 'update_enum_name', objectData: SchemaElementData, oldName: string, newName: string): void;
  (e: 'update_enum_values', data: SchemaEnumNodeData, newValues: string[]): void;
  (e: 'extract_inlined_element', objectData: SchemaEnumNodeData): void;
  (e: 'delete_element', objectData: SchemaElementData): void;
}>();

const enumName = ref(props.data.name);

function clickedNode() {
  emit('select_element', props.data.absolutePath);
}

function isEnumEditable() {
  return isHighlighted() && useSettings().schemaDiagram.editMode;
}

function isDefinedInDefinitions() {
  if (props.data.absolutePath.length < 2) {
    return false;
  }
  const parentKey = props.data.absolutePath[props.data.absolutePath.length - 2];
  return parentKey === '$defs' || parentKey === 'definitions';
}

function isHighlighted() {
  return props.selectedData && props.selectedData == props.data;
}

function updateEnumName() {
  const newName = enumName.value.trim();
  if (newName.length == 0) {
    return;
  }
  emit('update_enum_name', props.data, props.data.name, newName);
}

function updateEnumValues() {
  emit('update_enum_values', props.data, enumValues.value);
}

function deleteEnum() {
  emit('delete_element', props.data);
}

function extractInlinedObject() {
  emit('extract_inlined_element', props.data);
}

function deleteEnumItem(index: number) {
  enumValues.value.splice(index, 1);
  emit('update_enum_values', props.data, enumValues.value);
}

function addEnumItem() {
  enumValues.value.push('NEW_ITEM');
  emit('update_enum_values', props.data, enumValues.value);
}
</script>

<template>
  <div
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaenum': !isHighlighted}"
    @click="clickedNode()">
    <Handle type="target" :position="props.targetPosition!" class="vue-flow__handle"></Handle>
    <p>&lt;enumeration&gt;</p>

    <div v-if="!isEnumEditable() || !isDefinedInDefinitions()">
      <b>
        {{ props.data.name }}
      </b>

      <Button
        v-if="!isDefinedInDefinitions() && isHighlighted()"
        class="vue-flow-object-button"
        size="small"
        v-tooltip.bottom="'Extract inlined Object to definitions (will enable renaming and more)'"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @click="_ => extractInlinedObject()">
        <FontAwesomeIcon :icon="'fa-wrench fa-solid'" />
      </Button>

      <hr />

      <div
        v-if="useSettings().schemaDiagram.showEnumValues"
        v-for="(value,index) in props.data!.values">
        <p v-if="index < useSettings().schemaDiagram.maxEnumValuesToShow">
          {{ value }}
        </p>
      </div>
    </div>

    <div v-else>
      <InputText
        type="text"
        class="vue-flow-enum-name-inputtext"
        v-model="enumName"
        @blur="updateEnumName"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @keydown.stop
        @keyup.enter="updateEnumName" />
      <Button
        class="vue-flow-enum-button"
        size="small"
        v-tooltip.bottom="'Delete Enum'"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @click="_ => deleteEnum()">
        <FontAwesomeIcon :icon="'fa-trash fa-solid'" />
      </Button>

      <hr />

      <div v-if="useSettings().schemaDiagram.showEnumValues" v-for="(_, index) in enumValues">
        <InputText
          class="vue-flow-enumitem-input-dimensions"
          type="text"
          v-model="enumValues[index]"
          @blur="updateEnumValues"
          @mousedown.stop
          @click.stop
          @dblclick.stop
          @keydown.stop
          @keyup.enter="updateEnumValues">
        </InputText>

        <Button
          class="vue-flow-enum-button vue-flow-enumitem-input-dimensions"
          size="small"
          v-tooltip.bottom="'Delete Item'"
          @mousedown.stop
          @click.stop
          @dblclick.stop
          @click="_ => deleteEnumItem(index)">
          <FontAwesomeIcon :icon="'fa-trash fa-solid'" />
        </Button>
      </div>

      <Button
        class="vue-flow-enum-button"
        size="small"
        v-tooltip.bottom="'Add Item'"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @click="_ => addEnumItem()">
        <FontAwesomeIcon :icon="'fa-plus fa-solid'" />
      </Button>
    </div>

    <!--TODO: for loop only until given index based on maxItemsToShow. Instead of trimming beforehand, dynamically show only what is needed. This way, on edit mode all can be shown. and also on clicking the dots it can be expanded-->

    <Handle type="target" :position="props.sourcePosition!" class="vue-flow__handle"></Handle>
  </div>
</template>

<style>
.vue-flow__node-schemaenum {
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
  border: 1px solid #ddd;

  color: #536878;
  background: linear-gradient(135deg, #e9f5ff 0%, #ffffff 100%);
}

.vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}

.vue-flow-enum-name-inputtext {
  height: 26px;
  font-size: 14px;
  font-weight: bold;
}
.vue-flow-enum-button {
  width: 18px; /* Set fixed width */
  height: 18px; /* Set fixed height */
  font-size: 11px;
  position: relative;
  border: none; /* Remove border */
  background: none; /* Remove background */
  padding: 0; /* Remove padding */
  margin: 0; /* Remove margin */
  color: black;
  justify-content: center; /* Center items horizontally */
  align-items: center; /* Center items vertically */
}

.vue-flow-enumitem-input-dimensions {
  height: 18px;
  font-size: 10px;
}
</style>
