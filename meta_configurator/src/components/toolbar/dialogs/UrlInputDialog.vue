<!-- Dialog to select the initial schema -->
<script setup lang="ts">
import {ref} from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import {fetchSchemaFromUrl} from '@/components/toolbar/fetchSchemaFromUrl';
import InputText from 'primevue/inputtext';

const showDialog = ref(false);

const schemaUrl = ref('');

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

async function fetchSchemaFromSelectedUrl() {
  await fetchSchemaFromUrl(schemaUrl.value!);
  hideDialog();
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Fetch Schema from URL" modal class="max-w-md w-full">
    <div class="flex flex-col gap-4 p-2">
      <div class="flex flex-col gap-2">
        <label for="urlInput" class="font-medium text-gray-700"> Schema URL </label>
        <InputText
          v-model="schemaUrl"
          id="urlInput"
          placeholder="https://json-schema.org/draft/2020-12/schema"
          class="w-full" />
      </div>

      <small class="text-gray-500">
        Enter a valid URL to automatically load the JSON schema.
      </small>

      <div class="flex justify-end gap-3 mt-4">
        <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
        <Button
          label="Fetch Schema"
          icon="pi pi-download"
          @click="fetchSchemaFromSelectedUrl"
          :disabled="!schemaUrl"
          autofocus />
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
:deep(.p-dialog-header) {
  font-weight: 600;
  font-size: 1.1rem;
}
:deep(.p-inputtext) {
  border-radius: 0.5rem;
}
</style>
