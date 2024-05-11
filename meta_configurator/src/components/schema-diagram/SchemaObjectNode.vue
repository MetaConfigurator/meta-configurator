<script setup lang="ts">
import {Position} from '@vue-flow/core';
import {SchemaObjectNodeData} from '@/components/schema-diagram/schemaDiagramTypes';
import SchemaObjectAttribute from '@/components/schema-diagram/SchemaObjectAttribute.vue';

// props were passed from the slot using `v-bind="customNodeProps"`
const props = defineProps({
  data: SchemaObjectNodeData,
});
</script>

<template>
  <div class="vue-flow__node-schemaobject">
    <!--small><i>{{ props.data.absolutePath }}</i></small-->
    <b>{{ props.data.name }}</b>
    <hr />
    <SchemaObjectAttribute
      v-for="attribute in props.data!.attributes"
      :data="attribute!"></SchemaObjectAttribute>
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
