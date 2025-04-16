<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import TestComponentForMode from './TestComponentForMode.vue';
import {extractAllInlinedSchemaElements} from '@/schema/schemaManipulationUtils';
import {getDataForMode} from '@/data/useDataLink';

/**
 * This panel is intended for e2e testing purposes only.
 * It provides direct ways to call functions and influence the internal state.
 */

</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <div class="flex-grow overflow-y-auto">
      <TestComponentForMode class="h-full" :sessionMode="SessionMode.DataEditor" />
      <TestComponentForMode class="h-full" :sessionMode="SessionMode.SchemaEditor" />
      <TestComponentForMode class="h-full" :sessionMode="SessionMode.Settings" />
    </div>
  </div>
</template>

<style scoped></style>
