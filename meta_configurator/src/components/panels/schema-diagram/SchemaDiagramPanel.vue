<script setup lang="ts">
import type {SessionMode} from '@/store/sessionMode';
import JsonSchemaDiagramPanel from '@/components/panels/schema-diagram/JsonSchemaDiagramPanel.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
  <JsonSchemaDiagramPanel class="h-full" :sessionMode="props.sessionMode" />
</template>

<style scoped></style>
