<template>
  <RdfVisualizer
    v-if="statements.length"
    :statements="statements"
    :readOnly="true"
    @cancel-render="emit('cancel-render')" />
  <Message v-else severity="warn">
    No results. Please check your query and
    <a href="#" @click.prevent="emit('open-help')" class="text-blue-600 hover:underline">notes</a>.
  </Message>
</template>

<script setup lang="ts">
import Message from 'primevue/message';
import type * as $rdf from 'rdflib';
import RdfVisualizer from '@/components/panels/rdf/visualizer/RdfVisualizer.vue';

defineProps<{
  statements: $rdf.Statement[];
}>();

const emit = defineEmits<{
  (e: 'cancel-render'): void;
  (e: 'open-help'): void;
}>();
</script>
