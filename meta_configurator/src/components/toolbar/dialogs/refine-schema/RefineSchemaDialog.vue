<script setup lang="ts">
import {computed, nextTick, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import type {SchemaRefinementOptionsController} from '@/schema/refinement/schemaRefinementOptionsController';
import {applySchemaRefinements} from '@/components/toolbar/refineSchema';
import SchemaRefinementOptions from '@/components/toolbar/dialogs/shared/SchemaRefinementOptions.vue';

const showDialog = ref(false);
const refinementOptions = ref<SchemaRefinementOptionsController | null>(null);
const hasSelectedRefinements = computed(
  () => refinementOptions.value?.hasSelectedRefinements() ?? false
);

function openDialog() {
  showDialog.value = true;
  nextTick(() => {
    refinementOptions.value?.reset();
  });
}

function hideDialog() {
  showDialog.value = false;
}

function applySelectedRefinements() {
  const selection = hasSelectedRefinements.value ? refinementOptions.value?.buildSelection() : null;
  if (selection && applySchemaRefinements(selection)) {
    hideDialog();
  }
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Refine Schema"
    :modal="true"
    :style="{width: '50rem', maxWidth: '95vw'}">
    <div class="dialog-content">
      <Message severity="info">
        Select one or more refinement steps. As soon as you enable a step, its parameters appear
        with useful default values.
      </Message>

      <SchemaRefinementOptions
        ref="refinementOptions"
        id-prefix="refine"
        add-examples-description="Add real example values from the current input data to matching schema fields." />

      <div class="dialog-actions">
        <Button label="Cancel" severity="secondary" text @click="hideDialog" />
        <Button
          label="Apply"
          icon="pi pi-check"
          @click="applySelectedRefinements"
          :disabled="!hasSelectedRefinements" />
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
