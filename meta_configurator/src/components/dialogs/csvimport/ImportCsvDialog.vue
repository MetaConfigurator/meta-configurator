<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import InputSwitch from 'primevue/inputswitch';
import {useFileDialog} from '@vueuse/core';
import {readFileContentCsvToRef} from '@/utility/readFileContent';
import {CsvImportColumnMappingData} from '@/components/dialogs/csvimport/csvImportTypes';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {writeCsvToData} from '@/components/dialogs/csvimport/writeCsvToData';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {dataPathToSchemaPath, jsonPointerToPath, pathToString} from '@/utility/pathUtils';
import _ from 'lodash';
import {mergeAllOfs} from '@/schema/mergeAllOfs';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';

const showDialog = ref(false);
const currentUserCsv: Ref<any[]> = ref([]);

const delimiter: Ref<string> = ref(',');
const isInferSchema: Ref<boolean> = ref(false);
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
  if (isInferSchema.value) {
    addInferredSchema();
  }
  hideDialog();
}

function addInferredSchema() {
  const data = getDataForMode(SessionMode.DataEditor);
  const newDataPath = jsonPointerToPath('/' + pathBeforeRowIndex.value);
  const newData = data.dataAt(newDataPath);
  // we want to obtain an object which contains only the new data, in its proper path
  const dataWithOnlyNew = _.set({}, pathToString(newDataPath), newData);

  const inferredSchema = inferJsonSchema(dataWithOnlyNew);
  if (inferredSchema) {
    for (const column of currentColumnMapping.value) {
      addCustomTitleToSchemaProperty(inferredSchema, column);
    }

    const schema = getSchemaForMode(SessionMode.DataEditor);
    const currentSchema = schema.schemaRaw.value;
    // then we merge the new schema into the current one
    getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = mergeAllOfs({
      allOf: [currentSchema, inferredSchema],
    });
  }
}

function addCustomTitleToSchemaProperty(inferredSchema: any, column: CsvImportColumnMappingData) {
  const propertySchemaTitlePath = [
    ...dataPathToSchemaPath(column.getPathForJsonDocument(0)),
    'title',
  ];
  const titlePathString = pathToString(propertySchemaTitlePath);
  _.set(inferredSchema, titlePathString, column.titleInSchema);
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
        <label for="delimiter" class="mr-2"><b>Delimiter in the CSV document:</b></label>
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

        <div class="flex align-items-center vertical-center">
          <label for="delimiter" class="mr-2"><b>Infer and generate schema for the data:</b></label>
          <InputSwitch id="delimiter" v-model="isInferSchema" class="small-input" />
        </div>

        <div class="flex align-items-center vertical-center">
          <label for="delimiter" class="mr-2"
            ><b>Path for the resulting array in the document:</b></label
          >
          <InputText v-model="pathBeforeRowIndex" class="fixed-width" />
        </div>

        <p>
          CSV file has {{ currentUserCsv.length }} rows and
          {{ currentColumnMapping.length }} columns (attributes).
        </p>
        <p>Define the mapping from the CSV to the JSON document for each attribute.</p>

        <table>
          <thead>
            <tr>
              <th>Column Name</th>
              <th>Identifier</th>
              <th v-if="isInferSchema">Title</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="column in currentColumnMapping">
              <td>{{ column.name }}</td>
              <td>
                <span class="text-xs">/{{ column.pathBeforeRowIndex }}/ROW_INDEX/</span>
                <InputText v-model="column.pathAfterRowIndex" class="fixed-width" />
              </td>
              <td v-if="isInferSchema">
                <InputText v-model="column.titleInSchema" class="fixed-width" />
              </td>
            </tr>
          </tbody>
        </table>

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
