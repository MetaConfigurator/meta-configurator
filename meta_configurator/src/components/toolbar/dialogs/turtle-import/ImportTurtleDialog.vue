<!-- Dialog to import Turtle data -->
<script setup lang="ts">
import {type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {
  requestUploadFileToRef,
  turtleToJsonLD,
} from '@/components/toolbar/dialogs/turtle-import/importTurtleUtils';
import {useCurrentData} from '@/data/useDataLink';
import {toastService} from '@/utility/toastService';

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

watch(
  () => currentUserDataString.value,
  async (newValue, _) => {
    if (!newValue) return;
    isLoading.value = true;
    try {
      const jsonldResult = await turtleToJsonLD(newValue);
      useCurrentData().setData(jsonldResult);
      toastService.add({
        severity: 'info',
        summary: 'Successfull',
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
);

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Import Turtle">
    <div
      class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content"
      :style="{cursor: isLoading ? 'wait' : 'default'}">
      <div class="flex align-items-center">
        <Button
          label="Select Turtle Document"
          @click="requestUploadFile"
          class="p-button-raised p-button-rounded"
          :disabled="isLoading"></Button>
        <FontAwesomeIcon icon="fa-regular" class="text-green-500 ml-2" />
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
.vertical-center {
  display: flex;
  align-items: center;
}
</style>
