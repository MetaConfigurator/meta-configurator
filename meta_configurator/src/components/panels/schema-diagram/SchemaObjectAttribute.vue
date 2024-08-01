<script setup lang="ts">
import {
  SchemaElementData,
  SchemaObjectAttributeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import type {Path} from '@/utility/path';
import {Handle, Position} from '@vue-flow/core';
import {computed, type ComputedRef, ref} from 'vue';
import {useSettings} from '@/settings/useSettings';
import InputText from 'primevue/inputtext';
import {collectObjectDefinitionPaths} from "@/schema/schemaReadingUtils";
import {getSchemaForMode} from "@/data/useDataLink";
import {SessionMode} from "@/store/sessionMode";
import {pathToJsonPointer} from "@/utility/pathUtils";
import Dropdown from "primevue/dropdown";
import type {JsonSchemaObjectType, SchemaPropertyTypes} from "@/schema/jsonSchemaType";
import {determineTypeChoiceBySchema, typeChoices} from "@/components/panels/schema-diagram/typeUtils";

const props = defineProps<{
  data: SchemaObjectAttributeData;
  selectedData?: SchemaElementData;
}>();

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
  (
    e: 'update_attribute_name',
    attributeData: SchemaObjectAttributeData,
    oldName: string,
    newName: string
  ): void;
}>();

const attrName = ref(props.data.name);
const selectedType = ref(determineTypeChoiceBySchema(props.data.schema));


const isNameEditable = computed(() => {
  return useSettings().schemaDiagram.editMode;
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
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaattribute': !isHighlighted}"
    @click="clickedAttribute"
    v-on:click.stop>
    <span v-if="!isNameEditable" :class="{'line-through': props.data.deprecated}">{{
      props.data.name
    }}</span>
    <InputText
      v-if="isNameEditable"
      type="text"
      class="vue-flow-attribute-name-inputtext"
      v-model="attrName"
      @blur="updateAttributeName"
      @keydown.stop
      @keyup.enter="updateAttributeName" />
    <span class="text-red-600">{{ props.data.required ? '*' : '' }}</span>

    <span v-if="!isNameEditable" class="vue-flow__node-schemaattribute-type">: {{ props.data.typeDescription }}</span>
    <Dropdown
        v-model="selectedType"
        :options="typeChoices"
        optionLabel="label"
        @keydown.stop
        placeholder="Select Type" />

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



.vue-flow-attribute-name-inputtext {
  height: 18px;
  font-size: 10px;
}
</style>
