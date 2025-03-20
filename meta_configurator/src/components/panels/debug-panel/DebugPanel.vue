<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import DebugInfoForMode from '@/components/panels/debug-panel/DebugInfoForMode.vue';
import Button from 'primevue/button';
import {extractAllInlinedSchemaElements} from '@/schema/schemaManipulationUtils';
import {getDataForMode} from '@/data/useDataLink';

function extractAllSchemaElements() {
  const schemaData = getDataForMode(SessionMode.SchemaEditor);
  extractAllInlinedSchemaElements(schemaData, false, true);
}
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <div class="flex-grow overflow-y-auto">
      <DebugInfoForMode class="h-full" :sessionMode="SessionMode.DataEditor" />
      <DebugInfoForMode class="h-full" :sessionMode="SessionMode.SchemaEditor" />
      <DebugInfoForMode class="h-full" :sessionMode="SessionMode.Settings" />
      <Button @click="extractAllSchemaElements" label="Extract all inlined schema elements" />
    </div>
  </div>
</template>

<style scoped></style>
