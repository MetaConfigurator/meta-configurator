<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import InputSwitch from 'primevue/inputswitch';
import {useFileDialog} from '@vueuse/core';
import {readFileContentToRef} from '@/utility/readFileContent';
import {CsvImportColumnMappingData} from '@/components/dialogs/csvimport/csvImportTypes';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {writeCsvToData} from '@/components/dialogs/csvimport/writeCsvToData';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {dataPathToSchemaPath, jsonPointerToPath, pathToString} from '@/utility/pathUtils';
import _ from 'lodash';
import {mergeAllOfs} from '@/schema/mergeAllOfs';
import type {CsvError} from "csv-parse/browser/esm";
import {parse} from "csv-parse/browser/esm";

const showDialog = ref(false);

const currentUserDataString: Ref<string> = ref('');
const currentUserCsv: Ref<any[]> = ref([]);
const errorMessage: Ref<string> = ref('');

const delimiter: Ref<string> = ref(',');
const decimalSeparator: Ref<string> = ref('.'); // todo: auto infer initial value

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
    readFileContentToRef(files,currentUserDataString);
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


watch([currentUserDataString, decimalSeparator, delimiter], newValue => {
  loadCsvFromInput()
});

function loadCsvFromInput() {
  if (currentUserDataString.value.length > 0) {

    parse(
        currentUserDataString.value,
        {
          delimiter: delimiter.value,
          columns: true,
          skip_empty_lines: true,
          cast: true,
          trim: true,
        },
        (error: CsvError | undefined, records: any) => {
          if (error) {
            errorMessage.value = "With the given delimiter and decimal separator, the CSV could not be parsed. " +
               "\nPlease check the settings. " +
                "\nError: " + error.message;
            currentUserCsv.value = [];
          } else {
            errorMessage.value = "";
            currentUserCsv.value = records;
          }
        }
    );

    } else {
    currentUserCsv.value = [];
  }
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

      <div v-if="currentUserDataString.length > 0">

        <div class="flex align-items-center vertical-center">
          <label for="delimiter" class="mr-2"><b>Delimiter in the CSV document:</b></label>
          <InputText id="delimiter" v-model="delimiter" class="small-input" />
        </div>


        <div class="flex align-items-center vertical-center">
          <label for="decimalSeparator" class="mr-2"><b>Decimal Separator in the CSV document:</b></label>
          <InputText id="decimalSeparator" v-model="decimalSeparator" class="small-input" />
        </div>

        <p style="color: darkred; white-space: pre-line">{{errorMessage}}</p>

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
              <th>CSV Column</th>
              <th>JSON Property Identifier</th>
              <th v-if="isInferSchema">Property Schema Title</th>
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
