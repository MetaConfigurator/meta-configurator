<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {type Ref, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import InputText from 'primevue/inputtext';
import InputSwitch from 'primevue/inputswitch';
import {publishProjectLink, storeCurrentSnapshot} from '@/utility/backend/backendApi';

const showDialog = ref(false);

const resultString: Ref<string> = ref('');
const errorString: Ref<string> = ref('');

const publishProject = ref(false);
const projectId = ref('');
const editPassword = ref('');

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function requestSaveSnapshot() {
  resultString.value = '';
  storeCurrentSnapshot(resultString, errorString).then((snapshotId: string) => {
    if (publishProject.value) {
      publishProjectLink(
        projectId.value,
        editPassword.value,
        snapshotId,
        resultString,
        errorString
      );
    }
  });
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Save current Session">
    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
      <p>
        This will store the current data, schema and settings in the backend and provide a URL to
        restore the session later. A snapshot is only valid for a limited time and will be deleted
        after not being accessed for 45 days.
      </p>

      <div class="flex align-items-center">
        <Button
          label="Save Snapshot"
          @click="requestSaveSnapshot"
          class="p-button-raised p-button-rounded"></Button>
      </div>

      <div class="flex align-items-center vertical-center">
        <label for="delimiter" class="mr-2"><b>Publish project:</b></label>
        <InputSwitch id="delimiter" v-model="publishProject" class="small-input" />
      </div>

      <div v-if="publishProject">
        <InputText v-model="projectId" placeholder="Project ID" class="fixed-width" />
        <InputText
          v-model="editPassword"
          placeholder="Password for future edits"
          class="fixed-width" />
      </div>

      <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
        <Message v-if="resultString.length > 0" severity="success">
          The current session can be restored with the following URL:
          <a :href="resultString" target="_blank">{{ resultString }}</a>
        </Message>

        <Message v-if="errorString.length > 0" severity="error">{{ errorString }}</Message>
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
