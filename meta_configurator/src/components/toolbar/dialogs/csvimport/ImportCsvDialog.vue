<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import Panel from 'primevue/panel';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import RadioButton from 'primevue/radiobutton';
import ToggleSwitch from 'primevue/toggleswitch';
import {CsvImportColumnMappingData} from '@/components/toolbar/dialogs/csvimport/csvImportTypes';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {
  expandCsvDataIntoTable,
  writeCsvToData,
} from '@/components/toolbar/dialogs/csvimport/writeCsvToData';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {jsonPointerToPathTyped, pathToJsonPointer} from '@/utility/pathUtils';
import {
  computeMostUsedDelimiterAndDecimalSeparator,
  type LabelledPath,
  type LabelledValue,
} from '@/components/toolbar/dialogs/csvimport/delimiterSeparatorUtils';
import {
  decimalSeparatorOptions,
  delimiterOptions,
  detectPossibleTablesInJson,
  detectPropertiesOfTableInJson,
  findBestMatchingForeignKeyAttribute,
  inferExpansionSchema,
  inferSchemaForNewDataAndMergeIntoCurrentSchema,
  loadCsvFromUserString,
  requestUploadFileToRef,
} from '@/components/toolbar/dialogs/csvimport/importCsvUtils';

const emptyPathOption: LabelledPath = {label: 'not set', value: []};
const emptyValueOption: LabelledValue = {label: 'not set', value: 'not set'};

const showDialog = ref(false);

const currentUserDataString: Ref<string> = ref('');
const currentUserCsv: Ref<any[]> = ref([]);
const errorMessage: Ref<string> = ref('');

const delimiter: Ref<LabelledValue> = ref({
  label: 'not set',
  value: 'not set',
});
const decimalSeparator: Ref<LabelledValue> = ref({
  label: 'not set',
  value: 'not set',
});

const isInferSchema: Ref<boolean> = ref(true);
const isExpandWithLookupTables: Ref<boolean> = ref(false);

// options for import of standalone table
const pathBeforeRowIndex: Ref<string> = ref('myTableName');

// options for expansion with lookup table
const possiblePreviousTables: Ref<LabelledPath[]> = ref([]);
const tableToExpand: Ref<LabelledPath> = ref(emptyPathOption);
const possiblePrimaryKeyProps: Ref<LabelledValue[]> = ref([]);
const primaryKeyProp: Ref<LabelledValue> = ref(emptyValueOption);
const possibleForeignKeyProps: Ref<LabelledValue[]> = ref([]);
const foreignKey: Ref<LabelledValue> = ref(emptyValueOption);

// attribute mapping
const currentColumnMapping: Ref<CsvImportColumnMappingData[]> = ref([]);

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function requestUploadFile() {
  requestUploadFileToRef(currentUserDataString, pathBeforeRowIndex);
}

watch(currentUserDataString, newValue => {
  const {delimiterSuggestion, decimalSeparatorSuggestion} =
    computeMostUsedDelimiterAndDecimalSeparator(currentUserDataString.value);
  delimiter.value = delimiterSuggestion;
  decimalSeparator.value = decimalSeparatorSuggestion;
  // isInferSchema.value = isSchemaEmpty(useCurrentSchema().schemaRaw.value);
  loadCsvFromInput();
});
watch([decimalSeparator, delimiter], newValue => {
  loadCsvFromInput();
});

function loadCsvFromInput() {
  if (currentUserDataString.value.length == 0) {
    currentUserCsv.value = [];
    return;
  }
  loadCsvFromUserString(
    currentUserDataString,
    currentUserCsv,
    delimiter.value.value,
    decimalSeparator.value.value,
    errorMessage
  );
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

  possiblePreviousTables.value = detectPossibleTablesInJson(
    getDataForMode(SessionMode.DataEditor).data.value
  ).map(path => {
    return {
      label: pathToJsonPointer(path).slice(1), // cut off the first slash in json pointer, because it is auto-filled later (treated same as user input, where the user also does not write the slash themselves)
      value: path,
    };
  });

  // by default, select the first table to expand
  if (possiblePreviousTables.value.length > 0) {
    tableToExpand.value = possiblePreviousTables.value[0];
  }

  possiblePrimaryKeyProps.value = currentColumnMapping.value.map(column => {
    return {
      label: column.name,
      value: column.name,
    };
  });
  if (possiblePrimaryKeyProps.value.length > 0) {
    primaryKeyProp.value = possiblePrimaryKeyProps.value[0];
  }
});

// when user selected a table to expand, update the possible foreign key properties
watch(tableToExpand, newValue => {
  possibleForeignKeyProps.value = detectPropertiesOfTableInJson(
    getDataForMode(SessionMode.DataEditor).data.value,
    newValue.value
  ).map(prop => {
    return {
      label: prop,
      value: prop,
    };
  });
  // select the best matching foreign key property
  if (possibleForeignKeyProps.value.length > 0 && currentColumnMapping.value.length > 0) {
    const arrayPath = jsonPointerToPathTyped('/' + tableToExpand.value.value);
    const bestMatchingForeignKey = findBestMatchingForeignKeyAttribute(
      arrayPath,
      currentUserCsv.value,
      possibleForeignKeyProps.value.map(prop => prop.value),
      primaryKeyProp.value.value
    );
    foreignKey.value = {
      label: bestMatchingForeignKey,
      value: bestMatchingForeignKey,
    };
  }
  // update pathBeforeRowIndex to the table path
  pathBeforeRowIndex.value = pathToJsonPointer(newValue.value).slice(1);
});

function submitImport() {
  // write data
  if (!isExpandWithLookupTables.value) {
    writeCsvToData(currentUserCsv.value, currentColumnMapping.value);
  } else {
    expandCsvDataIntoTable(
      currentUserCsv.value,
      foreignKey.value.value,
      primaryKeyProp.value.value,
      currentColumnMapping.value
    );
  }

  // optionally infer schema
  if (isInferSchema.value) {
    addInferredSchema();
  }
  hideDialog();
  currentUserDataString.value = '';
}

function addInferredSchema() {
  const data = getDataForMode(SessionMode.DataEditor);

  if (!isExpandWithLookupTables.value) {
    const newDataPath = jsonPointerToPathTyped('/' + pathBeforeRowIndex.value);
    const newData = data.dataAt(newDataPath);
    inferSchemaForNewDataAndMergeIntoCurrentSchema(
      newData,
      newDataPath,
      currentColumnMapping.value
    );
  } else {
    const tableDataPath = jsonPointerToPathTyped('/' + tableToExpand.value.value);
    const tableData = data.dataAt(tableDataPath);
    inferExpansionSchema(
      tableData,
      tableDataPath,
      foreignKey.value.value,
      currentColumnMapping.value
    );
  }
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Import CSV">
    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
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

      <Panel
        v-if="currentUserDataString.length > 0"
        header="Import Options"
        toggleable
        :collapsed="true">
        <div>
          <div class="flex align-items-center vertical-center">
            <label for="delimiter" class="mr-2"><b>Delimiter in the CSV document:</b></label>
            <Select
              id="delimiter"
              v-model="delimiter"
              :options="delimiterOptions"
              :option-label="option => option.label" />
          </div>

          <div class="flex align-items-center vertical-center">
            <label for="decimalSeparator" class="mr-2"
              ><b>Decimal Separator in the CSV document:</b></label
            >
            <Select
              id="decimalSeparator"
              v-model="decimalSeparator"
              class="small-input"
              :options="decimalSeparatorOptions"
              :option-label="option => option.label" />
          </div>

          <p
            v-if="errorMessage.length > 0"
            style="color: red; white-space: pre-line; max-width: 1000px">
            {{ errorMessage }}
          </p>
        </div>

        <div
          v-if="currentUserCsv.length > 0"
          class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
          <Divider />

          <div class="flex flex-wrap gap-4">
            <div class="flex items-center">
              <RadioButton
                v-model="isExpandWithLookupTables"
                inputId="independentTable"
                name="independentTable"
                :value="false" />
              <label for="independentTable" class="ml-2">Independent Table</label>
            </div>
            <div class="flex items-center">
              <RadioButton
                v-model="isExpandWithLookupTables"
                inputId="expandWithLookupTable"
                name="expandWithLookupTable"
                :value="true"
                :disabled="possiblePreviousTables.length == 0" />
              <label for="expand" class="ml-2">Expand with Lookup Table</label>
            </div>
          </div>
          <div v-if="!isExpandWithLookupTables">
            <span>Import this CSV as a standalone table.</span>

            <div class="flex align-items-center vertical-center">
              <label for="delimiter" class="mr-2">
                <b>Path for the resulting array in the document:</b>
              </label>
              <InputText v-model="pathBeforeRowIndex" class="fixed-width" />
            </div>
          </div>
          <div v-else>
            <span
              >Use this CSV to expand an existing table by matching foreign keys with primary keys
              from the lookup table.</span
            >

            <div class="flex align-items-center vertical-center">
              <label class="mr-2">
                <b>Primary key in new CSV:</b>
              </label>
              <Select
                id="tableToExpand"
                v-model="primaryKeyProp"
                class="fixed-width"
                :options="possiblePrimaryKeyProps"
                :option-label="option => option.label" />
            </div>
            <div class="flex align-items-center vertical-center">
              <label class="mr-2">
                <b>Table to expand:</b>
              </label>
              <Select
                id="tableToExpand"
                v-model="tableToExpand"
                class="fixed-width"
                :options="possiblePreviousTables"
                :option-label="option => option.label" />
            </div>
            <div class="flex align-items-center vertical-center">
              <label class="mr-2">
                <b>Foreign key in existing data:</b>
              </label>
              <Select
                id="foreignKeyName"
                v-model="foreignKey"
                class="fixed-width"
                :options="possibleForeignKeyProps"
                :option-label="option => option.label" />
            </div>
          </div>

          <Divider />

          <div class="flex align-items-center vertical-center">
            <label for="delimiter" class="mr-2"
              ><b>Infer and generate schema for the data:</b></label
            >
            <ToggleSwitch id="delimiter" v-model="isInferSchema" class="small-input" />
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
                <!--th v-if="isInferSchema">Property Schema Title</--th-->
              </tr>
            </thead>
            <tbody>
              <tr v-for="column in currentColumnMapping">
                <td>{{ column.name }}</td>
                <td>
                  <span class="text-xs">/{{ column.pathBeforeRowIndex }}/ROW_INDEX/</span>
                  <span class="text-xs" v-if="isExpandWithLookupTables"
                    >{{ foreignKey.value }}/</span
                  >
                  <InputText v-model="column.pathAfterRowIndex" class="fixed-width" />
                </td>
                <!--td v-if="isInferSchema">
                <InputText v-model="column.titleInSchema" class="fixed-width" />
              </td-->
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Button
        v-if="currentUserCsv.length > 0"
        @click="submitImport"
        class="p-button-raised p-button-rounded"
        label="Import"></Button>
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
