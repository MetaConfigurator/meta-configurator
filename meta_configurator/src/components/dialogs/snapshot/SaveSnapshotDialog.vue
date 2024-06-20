<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {type Ref, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import {storeCurrentSnapshot} from '@/utility/backend/backendApi';

const showDialog = ref(false);

const resultString: Ref<string> = ref('');
const authorName: Ref<string> = ref('');

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function requestSaveSnapshot() {
  storeCurrentSnapshot(resultString, authorName.value);
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Save current Session">
    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
      <p>
        This will store the current data, schema and settings in the backend and provide a URL to
        restore the session later.
      </p>

      <InputText v-model="authorName" placeholder="Author Name" class="fixed-width" />

      <div class="flex align-items-center">
        <Button
          label="Save Session"
          @click="requestSaveSnapshot"
          class="p-button-raised p-button-rounded"></Button>
      </div>

      <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
        <Divider />
        <p v-if="resultString.length > 0">
          The current session can be restored with the following URL:
          <br />
          <a :href="resultString" target="_blank">{{ resultString }}</a>
        </p>
      </div>
    </div>
  </Dialog>
</template>
<style scoped>
.bigger-dialog-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.vertical-center {
  display: flex;
  align-items: center;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid black;
  padding: 10px;
  text-align: center;
}

th {
  background-color: #f0f0f0;
  font-weight: bold;
}

.fixed-width {
  width: 200px;
}
</style>
