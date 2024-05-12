<script setup lang="ts">
import {SchemaEnumNodeData} from '@/components/schema-diagram/schemaDiagramTypes';

// props were passed from the slot using `v-bind="customNodeProps"`
const props = defineProps({
  data: SchemaEnumNodeData,
});
</script>

<template>
  <div class="vue-flow__node-schemaobject">
    <p>&lt;enumeration&gt;</p>
    <!--small><i>{{ props.data.absolutePath }}</i></small-->
    <b>{{ props.data.name }}</b>
    <hr />
    <p v-for="value in props.data!.values">{{ value }}</p>
  </div>
</template>

<style>
.vue-flow__node-schemaobject {
  background: lightblue;
  color: black;

  border: 1px solid lightblue;
  border-radius: 4px;
  box-shadow: 0 0 0 3px lightblue;
  padding: 0px;
}
</style>
