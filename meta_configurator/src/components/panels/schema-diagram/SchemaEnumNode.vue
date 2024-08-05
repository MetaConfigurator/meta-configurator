<script setup lang="ts">
import {
  SchemaElementData,
  SchemaEnumNodeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import type {Path} from '@/utility/path';
import {Handle, Position} from '@vue-flow/core';
import {useSettings} from '@/settings/useSettings';
import {type Ref, ref} from 'vue';
import InputText from 'primevue/inputtext';

const props = defineProps<{
  data: SchemaEnumNodeData;
  targetPosition?: Position;
  sourcePosition?: Position;
  selectedData?: SchemaElementData;
}>();

// todo: create copy of array
const enumValues: Ref<string[]> = ref(props.data.values);

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
  (e: 'update_enum_name', objectData: SchemaElementData, oldName: string, newName: string): void;
  (e: 'update_enum_values', data: SchemaEnumNodeData, newValues: string[]): void;
}>();

const enumName = ref(props.data.name);

function clickedNode() {
  emit('select_element', props.data.absolutePath);
}

function isEnumEditable() {
  return isHighlighted();
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
</script>

<template>
  <div
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaenum': !isHighlighted}"
    @click="clickedNode()">
    <Handle type="target" :position="props.targetPosition!" class="vue-flow__handle"></Handle>
    <p>&lt;enumeration&gt;</p>

    <b v-if="!isEnumEditable()">
      {{ props.data.name }}
    </b>

    <InputText
      v-if="isEnumEditable()"
      type="text"
      class="vue-flow-object-name-inputtext"
      v-model="enumName"
      @blur="updateEnumName"
      @keydown.stop
      @keyup.enter="updateEnumName" />

    <hr />
    <p
      v-if="useSettings().schemaDiagram.showEnumValues && !isEnumEditable()"
      v-for="value in props.data!.values">
      {{ value }}
    </p>
    <!--TODO: for loop only until given index based on maxItemsToShow. Instead of trimming beforehand, dynamically show only what is needed. This way, on edit mode all can be shown. and also on clicking the dots it can be expanded-->

    <InputText
      v-if="useSettings().schemaDiagram.showEnumValues && isEnumEditable()"
      v-for="(value, index) in props.data!.values"
      type="text"
      v-model="enumValues[index]"
      @blur="updateEnumValues"
      @keydown.stop
      @keyup.enter="updateEnumValues">
      {{ value }}
    </InputText>

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
</style>
