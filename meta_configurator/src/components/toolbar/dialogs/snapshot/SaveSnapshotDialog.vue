<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {type Ref, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import Password from 'primevue/password';
import {publishProjectLink, storeCurrentSnapshot} from '@/utility/backend/backendApi';

const showDialog = ref(false);

const resultSnapshotLink: Ref<string> = ref('');
const resultProjectLink: Ref<string> = ref('');
const errorString: Ref<string> = ref('');
const infoString: Ref<string> = ref('');

const publishProject = ref(false);
const projectId = ref('');
const editPassword = ref('');
const editPasswordConfirm = ref('');

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function requestSaveSnapshot() {
  errorString.value = '';
  if (publishProject.value) {
    if (projectId.value.length < 3) {
      errorString.value = 'Project ID must be at least 3 characters.';
      return;
    }
    if (editPassword.value !== editPasswordConfirm.value) {
      errorString.value = 'Passwords do not match.';
      return;
    }
    if (editPassword.value.length < 8) {
      errorString.value = 'Password must be at least 8 characters.';
      return;
    }
  }
  resultSnapshotLink.value = '';
  resultProjectLink.value = '';
  storeCurrentSnapshot(resultSnapshotLink, infoString, errorString).then((snapshotId: string) => {
    if (publishProject.value) {
      publishProjectLink(
        projectId.value,
        editPassword.value,
        snapshotId,
        resultProjectLink,
        infoString,
        errorString
      );
    }
  });
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Save current Snapshot">
    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
      <p>
        This will store the current data, schema and settings in the backend and provide a URL to
        restore the session later.
        <br />
        A snapshot will be deleted after not being accessed for 30 days.
      </p>

      <div class="flex align-items-center vertical-center">
        <label for="delimiter" class="mr-2"><b>Publish project:</b></label>
        <ToggleSwitch id="delimiter" v-model="publishProject" class="small-input" />
      </div>

      <div v-if="publishProject" class="vertical-layout">
        <p>
          When publishing a project, you can choose the name of the project and set a password for
          future edits.
          <br />
          Projects will be deleted after not being accessed for 90 days.
        </p>
        <div class="flex align-items-center vertical-center">
          <label class="mr-2"><b>Project Identifier:</b></label>
          <InputText v-model="projectId" placeholder="Project ID" />
        </div>
        <div class="flex align-items-center vertical-center">
          <label class="mr-2"><b>Password:</b></label>
          <Password
            v-model="editPassword"
            placeholder="Password for future edits"
            class="mb-2 mt-2 mr-1"
            :feedback="false" />
          <Password
            v-model="editPasswordConfirm"
            placeholder="Confirm password"
            :feedback="false" />
        </div>
      </div>

      <div class="flex align-items-center">
        <Button
          :label="publishProject ? 'Save Project' : 'Save Snapshot'"
          @click="requestSaveSnapshot"
          class="p-button-raised p-button-rounded"></Button>
      </div>

      <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
        <Message
          v-if="resultProjectLink.length > 0 || resultSnapshotLink.length > 0"
          severity="success">
          <p v-if="resultSnapshotLink.length > 0">
            Snapshot:
            <a :href="resultSnapshotLink" target="_blank">{{ resultSnapshotLink }}</a>
          </p>
          <p v-if="resultProjectLink.length > 0">
            Project:
            <a :href="resultProjectLink" target="_blank">{{ resultProjectLink }}</a>
          </p>
        </Message>

        <Message v-if="errorString.length > 0" severity="error">{{ errorString }}</Message>
        <Message v-else-if="infoString.length > 0" severity="info">{{ infoString }}</Message>
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
.vertical-layout {
  display: flex;
  flex-direction: column;
  justify-content: center;
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
</style>
