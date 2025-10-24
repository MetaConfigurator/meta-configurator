<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import {computed, type ComputedRef, onMounted, ref, type Ref, watch} from 'vue';
import {identifyArraysInJson} from '@/utility/arrayPathUtils';
import type {Path} from '@/utility/path';
import {getDataForMode} from '@/data/useDataLink';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import {jsonPointerToPathTyped, pathToJsonPointer} from '@/utility/pathUtils';
import {
  convertToCSV,
  createItemRowsArraysFromObjects,
  createItemsRowsObjectsFromJson,
} from '@/components/panels/list-analysis/listAnalysisUtils';
import {ScrollPanel} from 'primevue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const data = getDataForMode(props.sessionMode);

const possibleArrays: Ref<string[]> = computed(() => {
  return identifyArraysInJson(data.data.value, [], false, true).map((path: Path) => {
    return pathToJsonPointer(path);
  });
});

// watch possible arrays and update selection based on it
watch(possibleArrays, (newPossibleArrays: string[]) => {
  if (newPossibleArrays.length == 0) {
    selectedArrayPointer.value = null;
  } else if (newPossibleArrays.length == 1) {
    selectedArrayPointer.value = possibleArrays.value[0];
  } else {
    // if there are multiple arrays, we do not change the selection
  }
});

const selectedArrayPointer: Ref<string | null> = ref(null);
const selectedArrayPath = computed(() => {
  if (selectedArrayPointer.value == null) {
    return null;
  }
  return jsonPointerToPathTyped(selectedArrayPointer.value);
});

const selectedArray: Ref<any | null> = computed(() => {
  if (selectedArrayPath.value == null) {
    return null;
  }
  return data.dataAt(selectedArrayPath.value);
});

// rows is an array of objects, each objects having an attribute for each column, with the name as given in the columnNames
const tableData: ComputedRef<null | {rows: any[]; columnNames: string[]}> = computed(() => {
  if (selectedArrayPath.value == null) {
    return null;
  }
  const currentData = data.dataAt(selectedArrayPath.value);
  return createItemsRowsObjectsFromJson(currentData);
});

function exportTableAsCsv() {
  if (tableData.value == null) {
    return;
  }
  const itemRowsArrays = createItemRowsArraysFromObjects(tableData.value.rows);
  const allRowsForCsv = [tableData.value.columnNames].concat(itemRowsArrays);
  const csvContent = convertToCSV(allRowsForCsv);
  const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'array_data.csv';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="panel-container">
    <PanelSettings panel-name="Table View" :panel-settings-path="['listAnalysis']">
      <p>
        This panel allows you to analyze object arrays in the current document. Select an object
        array to view its contents in a table format.
      </p>
    </PanelSettings>

    <div class="panel-content">
      <div class="ml-5 h-full">
        <ScrollPanel
          style="width: 100%; height: 100%"
          :dt="{
            bar: {
              background: '{primary.color}',
            },
          }">
          <div class="mt-3">
            <div v-if="possibleArrays.length == 0">
              <b>No object arrays available.</b>
            </div>
            <div v-else>
              <SelectButton v-model="selectedArrayPointer" :options="possibleArrays" />
            </div>
          </div>

          <div v-if="tableData" class="mt-3">
            <div style="overflow: auto; min-width: 0; max-width: 90%">
              <DataTable
                :value="selectedArray"
                showGridlines
                stripedRows
                resizable-columns
                removable-sort
                paginator
                :rows="30"
                size="small">
                <Column
                  v-for="columnName in tableData.columnNames"
                  :field="columnName"
                  :header="columnName"
                  :style="{maxWidth: '200px'}"
                  :sortable="true" />
              </DataTable>
            </div>

            <Button
              label="Export table as CSV"
              icon="pi pi-download"
              @click="exportTableAsCsv"
              class="mt-3" />
          </div>
        </ScrollPanel>
      </div>
    </div>
  </div>
</template>

<style scoped>
.heading {
  font-size: 24px; /* Make the text bigger */
  font-weight: bold; /* Make the text bold */
  text-align: center; /* Center the text horizontally */
  display: block; /* Ensure the label behaves like a block element */
  margin-bottom: 10px; /* Add some space below the label */
}

.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.panel-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
