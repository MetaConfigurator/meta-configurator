<!-- Dialog to import Turtle data -->
<script setup lang="ts">
import {type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import {
  requestUploadFileToRef,
  turtleToJsonLD,
} from '@/components/toolbar/dialogs/turtle-import/importTurtleUtils';
import {useCurrentData} from '@/data/useDataLink';
import {toastService} from '@/utility/toastService';
import Message from 'primevue/message';

const isLoading = ref(false);
const showDialog = ref(false);
const currentUserDataString: Ref<string> = ref('');

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function requestUploadFile() {
  requestUploadFileToRef(currentUserDataString);
}

async function importTurtleData(turtle: string): Promise<void> {
  isLoading.value = true;
  try {
    const jsonldResult = await turtleToJsonLD(turtle);
    useCurrentData().setData(jsonldResult);
    toastService.add({
      severity: 'info',
      summary: 'Successful',
      detail: 'Conversion finished.',
      life: 3000,
    });
  } catch (error) {
    toastService.add({
      severity: 'error',
      summary: 'Error',
      detail: error,
      life: 10000,
    });
  } finally {
    isLoading.value = false;
    hideDialog();
    currentUserDataString.value = '';
  }
}

watch(currentUserDataString, newValue => {
  if (newValue) importTurtleData(newValue);
});

defineExpose({show: openDialog, close: hideDialog});
</script>
<template>
  <Dialog v-model:visible="showDialog" header="Import Turtle">
    <div
      class="flex flex-column gap-3 bigger-dialog-content"
      :style="{cursor: isLoading ? 'wait' : 'default'}">
      <Message severity="warn" :closable="false" icon="pi pi-exclamation-triangle">
        Importing a Turtle file will overwrite your existing data. <br />
        The schema will remain unchanged.
      </Message>
      <div class="flex align-items-center justify-content-center gap-2">
        <Button label="Select File" @click="requestUploadFile" :disabled="isLoading" />
      </div>

      <div v-if="isLoading" class="mt-3 text-sm text-gray-500">Importing, please wait...</div>
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
</style>
