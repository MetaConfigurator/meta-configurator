<script setup lang="ts">
import {SchemaEnumNodeData} from '@/components/schema-diagram/schemaDiagramTypes';
import {getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {Path} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';

// props were passed from the slot using `v-bind="customNodeProps"`
const props = defineProps<{
  data: SchemaEnumNodeData;
}>();

const schemaSession = getSessionForMode(SessionMode.SchemaEditor);

const emit = defineEmits<{
  (e: 'select_element', path: Path): void;
}>();

function clickedNode() {
  emit('select_element', props.data.absolutePath);
}

function isHighlighted() {
  return (
    pathToString(schemaSession.currentSelectedElement.value) ===
    pathToString(props.data.absolutePath)
  );
}
</script>

<template>
  <div
    :class="{'bg-yellow-100': isHighlighted(), 'vue-flow__node-schemaenum': !isHighlighted}"
    @click="clickedNode()">
    <p>&lt;enumeration&gt;</p>
    <!--small><i>{{ props.data.absolutePath }}</i></small-->
    <b>{{ props.data.name }}</b>
    <hr />
    <p v-for="value in props.data!.values">{{ value }}</p>
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
</style>
