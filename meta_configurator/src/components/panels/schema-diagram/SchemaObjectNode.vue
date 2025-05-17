<script setup lang="ts">
import {
  SchemaElementData,
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
  data: SchemaObjectNodeData;
  targetPosition?: Position;
  sourcePosition?: Position;
  selectedData?: SchemaElementData;
  typeChoices: AttributeTypeChoice[];
}>();

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
  (e: 'zoom_into_element', path: Path): void;
  (e: 'delete_element', objectData: SchemaElementData): void;
  (e: 'extract_inlined_element', objectData: SchemaObjectNodeData): void;
  (
    e: 'update_object_name',
    objectData: SchemaObjectNodeData,
    oldName: string,
    newName: string
  ): void;
  (
    e: 'update_attribute_name',
    attributeData: SchemaObjectAttributeData,
    oldName: string,
    newName: string
  ): void;
  (
    e: 'update_attribute_type',
    attributeData: SchemaObjectAttributeData,
    newType: AttributeTypeChoice
  ): void;
  (e: 'add_attribute', objectData: SchemaObjectNodeData): void;
}>();

const objectName = ref(props.data.name || '');

const settings = useSettings();

function isObjectEditable() {
  return (isHighlighted() || isAttributeHighlighted()) && settings.value.schemaDiagram.editMode;
}

function isNameEditable() {
  return isObjectEditable() && props.data.hasUserDefinedName;
}

function isDefinedInDefinitions() {
  return isSubSchemaDefinedInDefinitions(props.data.absolutePath);
}

function isRootObject() {
  return props.data.absolutePath.length == 0;
}

function isExtractable() {
  return !isDefinedInDefinitions() && isObjectEditable() && !isRootObject();
}

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
  if (!props.data.name) {
    throw new Error(
      'Object name is not defined. This should not happen. Only objects with a name should allow edits of the name. Please report this issue.'
    );
  }
  emit('update_object_name', props.data, props.data.name, newName);
}
function updateAttributeName(
  attributeData: SchemaObjectAttributeData,
  oldName: string,
  newName: string
) {
  emit('update_attribute_name', attributeData, oldName, newName);
}

function updateAttributeType(
  attributeData: SchemaObjectAttributeData,
  newType: AttributeTypeChoice
) {
  emit('update_attribute_type', attributeData, newType);
}

function deleteObject() {
  deleteElement(props.data);
}

function extractInlinedObject() {
  emit('extract_inlined_element', props.data);
}

function deleteElement(data: SchemaElementData) {
  emit('delete_element', data);
}

function addAttribute() {
  emit('add_attribute', props.data);
}

function isHighlighted() {
  return props.selectedData && props.selectedData == props.data;
}

function isAttributeHighlighted() {
  if (props.selectedData) {
    for (const attribute of props.data.attributes) {
      if (props.selectedData == attribute) {
        return true;
      }
    }
  }
  return false;
}
</script>

<template>
  <div
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaobject': !isHighlighted}"
    @click="clickedNode()"
    @click.stop
    @dblclick="doubleClickedNode()">
    <Handle type="target" :position="props.targetPosition!" class="vue-flow__handle"></Handle>

    <div v-if="!isNameEditable() || !isDefinedInDefinitions()">
      <b>
        {{
          getObjectDisplayName(
            props.data.name,
            props.data.title,
            props.data.fallbackDisplayName,
            isDefinedInDefinitions()
          )
        }}
      </b>
      <Button
        v-if="isExtractable()"
        class="vue-flow-object-button"
        size="small"
        v-tooltip.bottom="
          'Extract inlined object schema to definitions (will enable renaming and more)'
        "
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @click="_ => extractInlinedObject()">
        <FontAwesomeIcon :icon="'fa-wrench fa-solid'" />
      </Button>
    </div>

    <div v-else>
      <InputText
        type="text"
        class="vue-flow-object-name-inputtext"
        v-model="objectName"
        @blur="updateObjectName"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @keydown.stop
        @keyup.enter="updateObjectName" />
      <Button
        class="vue-flow-object-button"
        size="small"
        v-tooltip.bottom="'Delete Object'"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @click="_ => deleteObject()">
        <FontAwesomeIcon :icon="'fa-trash fa-solid'" />
      </Button>
    </div>

    <hr />
    <SchemaObjectAttribute
      v-if="settings.schemaDiagram.showAttributes"
      v-for="attribute in props.data!.attributes"
      :data="attribute!"
      :key="attribute!.name + attribute.index + attribute.typeDescription"
      :selected-data="props.selectedData"
      :type-choices="props.typeChoices"
      @select_element="clickedAttribute"
      @update_attribute_name="updateAttributeName"
      @update_attribute_type="updateAttributeType"
      @delete_element="deleteElement" />

    <div v-if="isObjectEditable()">
      <Button
        size="small"
        v-tooltip.bottom="'Add Property'"
        @click="_ => addAttribute()"
        @click.stop
        @dblclick.stop
        @mousedown.stop
        class="vue-flow-object-button">
        <FontAwesomeIcon :icon="'fa-plus fa-solid'" />
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

.vue-flow-object-name-inputtext {
  height: 26px;
  font-size: 14px;
  font-weight: bold;
}
.vue-flow-object-button {
  font-size: 11px;
  position: relative;
  border: none; /* Remove border */
  background: none; /* Remove background */
  padding: 0; /* Remove padding */
  margin-left: 5px;
  color: black;
}
</style>
