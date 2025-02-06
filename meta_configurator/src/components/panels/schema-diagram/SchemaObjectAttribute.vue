<script setup lang="ts">
import {
  SchemaElementData,
  SchemaObjectAttributeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import type {Path} from '@/utility/path';
import {Handle, Position} from '@vue-flow/core';
import {type Ref, ref, watch} from 'vue';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import {
  type AttributeTypeChoice,
  determineTypeChoiceBySchema,
} from '@/components/panels/schema-diagram/typeUtils';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {useSettings} from '@/settings/useSettings';

const settings = useSettings();

const props = defineProps<{
  data: SchemaObjectAttributeData;
  selectedData?: SchemaElementData;
  typeChoices: AttributeTypeChoice[];
}>();

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
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
  (e: 'delete_element', objectData: SchemaElementData): void;
}>();

const attrName = ref(props.data.name);
const selectedType: Ref<AttributeTypeChoice | undefined> = ref(
  determineTypeChoiceBySchema(props.typeChoices, props.data.schema)
);

watch(selectedType, () => {
  if (selectedType.value != undefined) {
    emit('update_attribute_type', props.data, selectedType.value);
  }
});

function clickedAttribute() {
  emit('select_element', props.data.absolutePath);
}
function updateAttributeName() {
  const newName = attrName.value.trim();
  if (newName.length == 0) {
    return;
  }
  emit('update_attribute_name', props.data, props.data.name, newName);
}

function deleteAttribute() {
  emit('delete_element', props.data);
}

function isEditable() {
  return isHighlighted() && settings.value.schemaDiagram.editMode;
}

function isHighlighted() {
  return props.selectedData && props.selectedData == props.data;
}

function getHandleId() {
  return `source-${props.data.name}`;
}

function getHandleTop() {
  let val = 42;

  val += 24 * props.data.index;

  return `${val}px`;
}
</script>

<template>
  <div
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaattribute': !isHighlighted()}"
    @click="clickedAttribute"
    v-on:click.stop>
    <div v-if="!isEditable()">
      <span :class="{'line-through': props.data.deprecated}">{{ props.data.name }}</span>
      <span class="text-red-600">{{ props.data.required ? '*' : '' }}</span>
      <span class="vue-flow__node-schemaattribute-type">: {{ props.data.typeDescription }}</span>
    </div>

    <div v-else>
      <InputText
        type="text"
        class="vue-flow-attribute-input-dimensions"
        v-model="attrName"
        @blur="updateAttributeName"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @keydown.stop
        @keyup.enter="updateAttributeName" />
      <span class="text-red-600">{{ props.data.required ? '*' : '' }}</span>

      <Select
        class="vue-flow-attribute-dropdown"
        v-model="selectedType"
        :options="typeChoices"
        optionLabel="label"
        @mousedown.stop
        @keydown.stop
        @click.stop
        @dblclick.stop
        placeholder="Select Type" />

      <Button
        class="vue-flow-attribute-button vue-flow-attribute-input-dimensions"
        size="small"
        v-tooltip.bottom="'Delete Property'"
        @mousedown.stop
        @click.stop
        @dblclick.stop
        @click="_ => deleteAttribute()">
        <FontAwesomeIcon :icon="'fa-trash fa-solid'" />
      </Button>
    </div>

    <Handle
      :id="getHandleId()"
      type="source"
      :position="Position.Right"
      class="vue-flow__attribute_handle"
      :style="{top: getHandleTop()}"></Handle>
  </div>
</template>

<style>
.vue-flow__node-schemaattribute {
  padding: 0;
}
.vue-flow__node-schemaattribute-type {
  font-size: 0.8em;
  color: gray;
}

.vue-flow__attribute_handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}

.vue-flow-attribute-input-dimensions {
  height: 18px;
  font-size: 10px;
}
.vue-flow-attribute-button {
  width: 18px; /* Set fixed width */
  height: 18px; /* Set fixed height */
  font-size: 11px;
  position: relative;
  border: none; /* Remove border */
  background: none; /* Remove background */
  padding: 0; /* Remove padding */
  margin-left: 5px;
  color: black;
  justify-content: center; /* Center items horizontally */
  align-items: center; /* Center items vertically */
}
.vue-flow-attribute-dropdown {
  height: 18px; /* Adjust height */
  font-size: 10px; /* Adjust font size */
  padding: 0 4px; /* Adjust padding to ensure text is inside the box */
  line-height: 18px; /* Adjust line-height to match the height */
  display: flex; /* Use flexbox to align items */
  align-items: center; /* Center items vertically */
  box-sizing: border-box; /* Ensure padding is included in the height */
}
</style>
