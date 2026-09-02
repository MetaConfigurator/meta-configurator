<script setup lang="ts">
import {computed, nextTick, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import type {SchemaRefinementOptionsController} from '@/schema/refinement/schemaRefinementOptionsController';
import {applySchemaRefinements} from '@/components/toolbar/refineSchema';
import SchemaRefinementOptions from '@/components/toolbar/dialogs/shared/SchemaRefinementOptions.vue';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {hasJsonContent} from '@/utility/jsonCompatible';

const showDialog = ref(false);
const refinementOptions = ref<SchemaRefinementOptionsController | null>(null);

const dataEditorLink = getDataForMode(SessionMode.DataEditor);
const hasCurrentData = computed(() => hasJsonContent(dataEditorLink.data.value));
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
    header="Refine Schema based on Data"
    :modal="true"
    :style="{width: '50rem', maxWidth: '95vw'}">
    <div class="dialog-content">
      <Message v-if="!hasCurrentData" severity="warn" :closable="false">
        No data is currently loaded in the Data Editor. These refinement steps derive their values
        from the current data, so they cannot improve the schema until data is loaded.
      </Message>

      <Message severity="info">
        Select one or more refinement steps. Each step inspects the data in the Data Editor and
        refines the current schema accordingly. As soon as you enable a step, its parameters appear
        with useful default values.
      </Message>

      <SchemaRefinementOptions
        ref="refinementOptions"
        id-prefix="refine"
        :show-data-independent-steps="false"
        add-examples-description="Add real example values from the current input data to matching schema fields." />

      <div class="dialog-actions">
        <Button label="Cancel" severity="secondary" text @click="hideDialog" />
        <Button
          label="Apply"
          icon="pi pi-check"
          @click="applySelectedRefinements"
          :disabled="!hasSelectedRefinements || !hasCurrentData" />
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
