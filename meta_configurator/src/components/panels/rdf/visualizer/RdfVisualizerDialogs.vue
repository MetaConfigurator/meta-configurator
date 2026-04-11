<template>
  <Dialog
    :visible="showLargeGraphPrompt"
    header="Large graph detected"
    modal
    :closable="false"
    @update:visible="emit('update:showLargeGraphPrompt', $event)">
    <Message severity="secondary" variant="simple" :closable="false">
      <template #default>
        This graph contains <strong>{{ nodeCount }}</strong> nodes. Rendering may be slow for graphs
        with more than <strong>{{ maximumNodesToVisualize }}</strong> nodes.
        <br />
        You can adjust this value in the settings. Do you want to continue?
      </template>
    </Message>
    <template #footer>
      <Button label="No" icon="pi pi-times" text @click="emit('confirm-render', false)" />
      <Button label="Yes" icon="pi pi-check" text @click="emit('confirm-render', true)" />
    </template>
  </Dialog>

  <Dialog
    :visible="deletePropertyDialog"
    header="Confirm"
    modal
    @update:visible="emit('update:deletePropertyDialog', $event)">
    <div class="flex items-center gap-4">
      <i class="pi pi-exclamation-triangle !text-3xl" />
      <span>Are you sure you want to delete the selected property?</span>
    </div>
    <template #footer>
      <Button
        label="No"
        icon="pi pi-times"
        text
        @click="emit('update:deletePropertyDialog', false)"
        severity="secondary"
        variant="text" />
      <Button
        label="Yes"
        icon="pi pi-check"
        text
        @click="emit('confirm-delete-property')"
        severity="danger" />
    </template>
  </Dialog>

  <Dialog
    :visible="deleteNodeDialog"
    header="Confirm"
    modal
    @update:visible="emit('update:deleteNodeDialog', $event)">
    <div class="flex items-center gap-4">
      <i class="pi pi-exclamation-triangle !text-3xl" />
      <span>Are you sure you want to delete the selected node?</span>
    </div>
    <template #footer>
      <Button
        label="No"
        icon="pi pi-times"
        text
        @click="emit('update:deleteNodeDialog', false)"
        severity="secondary"
        variant="text" />
      <Button
        label="Yes"
        icon="pi pi-check"
        text
        @click="emit('confirm-delete-node')"
        severity="danger" />
    </template>
  </Dialog>

  <Dialog
    :visible="renameNodeDialog"
    header="Rename Node"
    modal
    maximizable
    :style="{width: '520px'}"
    @update:visible="emit('update:renameNodeDialog', $event)">
    <div class="flex flex-col gap-3">
      <label class="text-sm font-medium">Node IRI</label>
      <InputText
        :modelValue="renameNodeValue"
        @update:modelValue="emit('update:renameNodeValue', $event || '')"
        placeholder="Enter new IRI" />
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" @click="emit('update:renameNodeDialog', false)" />
      <Button label="Save" @click="emit('confirm-rename-node')" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import InputText from 'primevue/inputtext';

defineProps<{
  showLargeGraphPrompt: boolean;
  nodeCount: number;
  maximumNodesToVisualize: number;
  deletePropertyDialog: boolean;
  deleteNodeDialog: boolean;
  renameNodeDialog: boolean;
  renameNodeValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:showLargeGraphPrompt', value: boolean): void;
  (e: 'confirm-render', allow: boolean): void;
  (e: 'update:deletePropertyDialog', value: boolean): void;
  (e: 'confirm-delete-property'): void;
  (e: 'update:deleteNodeDialog', value: boolean): void;
  (e: 'confirm-delete-node'): void;
  (e: 'update:renameNodeDialog', value: boolean): void;
  (e: 'update:renameNodeValue', value: string): void;
  (e: 'confirm-rename-node'): void;
}>();
</script>
