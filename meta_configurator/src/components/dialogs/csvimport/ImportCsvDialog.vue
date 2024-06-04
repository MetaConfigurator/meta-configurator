<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import {useFileDialog} from '@vueuse/core';
import {readFileContentCsvToRef} from '@/utility/readFileContent';
import {CsvImportColumnMappingData} from '@/components/dialogs/csvimport/csvImportTypes';
import CsvImportColumnMapping from '@/components/dialogs/csvimport/CsvImportColumnMapping.vue';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {writeCsvToData} from '@/components/dialogs/csvimport/writeCsvToData';

const showDialog = ref(false);
const currentUserCsv: Ref<any[]> = ref([]);

const delimiter: Ref<string> = ref(',');
const pathBeforeRowIndex: Ref<string> = ref('myTableName');
const currentColumnMapping: Ref<CsvImportColumnMappingData[]> = ref([]);

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function requestUploadFile() {
  const {open, onChange} = useFileDialog();

  onChange((files: FileList | null) => {
    readFileContentCsvToRef(files, delimiter.value, currentUserCsv);
  });
  open();
}

function submitImport() {
  writeCsvToData(currentUserCsv.value, currentColumnMapping.value);
  hideDialog();
}

// Watch for changes in currentUserCsv and update fields shown to user accordingly
watch(currentUserCsv, newValue => {
  if (currentUserCsv.value.length > 0) {
    // Get the first row of the CSV file and use it as the column names
    const columns = Object.keys(currentUserCsv.value[0]);
    currentColumnMapping.value = columns.map((column, index) => {
      return new CsvImportColumnMappingData(index, column, pathBeforeRowIndex);
    });
  } else {
    currentColumnMapping.value = [];
  }
});

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Import CSV">
    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
      <p>
        The import will insert the CSV data into your current document, overwriting existing data
        for paths with a conflict.
      </p>

      <div class="flex align-items-center vertical-center">
        <label for="delimiter" class="mr-2">Delimiter in the CSV document:</label>
        <InputText id="delimiter" v-model="delimiter" class="small-input" />
      </div>

      <div class="flex align-items-center">
        <Button
          label="Select CSV Document"
          @click="requestUploadFile"
          class="p-button-raised p-button-rounded"></Button>
        <FontAwesomeIcon
          v-if="currentUserCsv.length > 0"
          icon="fa-regular fa-circle-check"
          class="text-green-500 ml-2" />
      </div>

      <div
        v-if="currentUserCsv.length > 0"
        class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
        <Divider />

        <p>
          CSV file has {{ currentUserCsv.length }} rows and
          {{ currentColumnMapping.length }} columns (attributes).
        </p>
        <p>Define the mapping from the CSV to the JSON document for each attribute.</p>

        <div>
          <CsvImportColumnMapping
            v-for="column in currentColumnMapping"
            :key="column.index"
            :column-data="column" />
        </div>

        <Divider />

        <Button
          @click="submitImport"
          class="p-button-raised p-button-rounded"
          label="Import"></Button>
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
.small-input {
  width: 50px;
}
.vertical-center {
  display: flex;
  align-items: center;
}
</style>
