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
  <Dialog v-model:visible="showDialog">
    <div class="p-fluid">
      <div class="p-field">
        <label for="urlInput">Enter the URL of the schema:</label>
        <InputText v-model="schemaUrl" id="urlInput" />
      </div>
      <div class="p-dialog-footer">
        <div class="button-container">
          <Button label="Cancel" @click="hideDialog" class="dialog-button" />
          <Button label="Fetch Schema" @click="fetchSchemaFromSelectedUrl" class="dialog-button" />
        </div>
      </div>
    </div>
  </Dialog>
</template>
<style scoped>
.button-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 1rem;
}
</style>
