<script setup lang="ts">
import {
  SchemaElementData,
  SchemaObjectAttributeData,
} from '@/components/panels/schema-diagram/schemaDiagramTypes';
import {getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {Path} from '@/utility/path';

const props = defineProps<{
  data: SchemaObjectAttributeData;
  selectedData?: SchemaElementData;
}>();

const schemaSession = getSessionForMode(SessionMode.SchemaEditor);

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
}>();

function clickedAttribute() {
  emit('select_element', props.data.absolutePath);
}

function isHighlighted() {
  return props.selectedData && props.selectedData == props.data;
}
</script>

<template>
  <div
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaattribute': !isHighlighted}"
    @click="clickedAttribute"
    v-on:click.stop>
    <span :class="{'line-through': props.data.deprecated}">{{ props.data.name }}</span>
    <span class="text-red-600">{{ props.data.required ? '*' : '' }}</span>
    <span>: {{ props.data.typeDescription }}</span>
  </div>
</template>

<style>
.vue-flow__node-schemaattribute {
  padding: 0px;
}
</style>