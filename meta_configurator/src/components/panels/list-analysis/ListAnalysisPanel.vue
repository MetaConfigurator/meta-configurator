<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import {computed, type ComputedRef, nextTick, ref, type Ref, watch} from 'vue';
import {identifyArraysInJson} from '@/utility/arrayPathUtils';
import type {Path} from '@/utility/path';
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import ToggleButton from 'primevue/togglebutton';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import {
  arePathsEqual,
  jsonPointerToPathTyped,
  pathToJsonPointer,
  pathToString,
} from '@/utility/pathUtils';
import {
  convertToCSV,
  createItemRowsArraysFromObjects,
  createItemsRowsObjectsFromJson,
  type TableColumnDefinition,
} from '@/components/panels/list-analysis/listAnalysisUtils';
import {ScrollPanel} from 'primevue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import TableCellEditor from '@/components/panels/list-analysis/TableCellEditor.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const data = getDataForMode(props.sessionMode);
const session = getSessionForMode(props.sessionMode);

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
    selectedArrayPointer.value = possibleArrays.value[0] ?? null;
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

const editMode = ref(false);

const rowsPerPage = 30;
// index of the first displayed row; bound to the paginator so we can jump pages
const firstRow = ref(0);

const currentSchema = computed(() => {
  if (selectedArrayPath.value == null) {
    return null;
  }
  const schema = getSchemaForMode(props.sessionMode);
  return schema.schemaWrapperAtPath(selectedArrayPath.value);
});

interface TableData {
  rows: any[];
  columns: TableColumnDefinition[];
}

const tableData: ComputedRef<null | TableData> = computed(() => {
  if (selectedArray.value == null) {
    return null;
  }

  return createItemsRowsObjectsFromJson(selectedArray.value);
});

function schemaForColumn(columnPath: Path): JsonSchemaWrapper {
  if (currentSchema.value == null) {
    return new JsonSchemaWrapper({}, props.sessionMode, false);
  }

  const itemSchema = currentSchema.value.items;
  return itemSchema.subSchemaAt(columnPath) ?? itemSchema;
}

function cellPath(rowData: any, column: TableColumnDefinition): Path {
  return selectedArrayPath.value
    ? [...selectedArrayPath.value, rowData.__originalIndex, ...column.path]
    : column.path;
}

function cellElementId(path: Path): string {
  return 'table-cell_' + pathToString(path);
}

function selectTableCell(path: Path) {
  session.updateCurrentSelectedElement(path);
}

function isSelectedCell(path: Path): boolean {
  return arePathsEqual(session.currentSelectedElement.value, path);
}

// scroll to (and paginate to) the cell that matches the currently selected element,
// so a selection made in another panel (e.g. the GUI editor) reveals the cell here.
watch(session.currentSelectedElement, selected => scrollToSelectedCell(selected), {deep: true});

function scrollToSelectedCell(selected: Path) {
  const arrayPath = selectedArrayPath.value;
  if (arrayPath == null || tableData.value == null) {
    return;
  }
  // the selection must point inside the array currently shown in the table
  if (
    selected.length <= arrayPath.length ||
    !arePathsEqual(arrayPath, selected.slice(0, arrayPath.length))
  ) {
    return;
  }
  const rowPosition = tableData.value.rows.findIndex(
    row => String(row.__originalIndex) === String(selected[arrayPath.length])
  );
  if (rowPosition < 0) {
    return;
  }
  // jump to the page containing the row, then scroll the cell into view
  firstRow.value = Math.floor(rowPosition / rowsPerPage) * rowsPerPage;
  nextTick(() => {
    window.setTimeout(() => {
      document
        .getElementById(cellElementId(selected))
        ?.scrollIntoView({block: 'center', behavior: 'smooth'});
    }, 5);
  });
}

function exportTableAsCsv() {
  if (tableData.value == null) {
    return;
  }
  const itemRowsArrays = createItemRowsArraysFromObjects(tableData.value.rows);
  const columnLabels = tableData.value.columns.map(column => column.label);
  const allRowsForCsv = [columnLabels].concat(itemRowsArrays);
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
    <PanelSettings
      panel-display-name="Table View"
      panel-type="tableView"
      :panel-settings-path="['tableView']"
      :sessionMode="props.sessionMode">
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
              <ToggleButton
                class="ml-5"
                v-model="editMode"
                onLabel="Read Only"
                offLabel="Edit Mode"
                onIcon="pi pi-eye"
                offIcon="pi pi-pencil"
                :aria-label="editMode ? 'Switch to read only mode' : 'Switch to edit mode'" />
            </div>
          </div>

          <div v-if="tableData" class="mt-3">
            <div style="overflow: auto; min-width: 0; max-width: 90%">
              <DataTable
                :value="tableData.rows"
                v-model:first="firstRow"
                showGridlines
                stripedRows
                resizable-columns
                removable-sort
                paginator
                :rows="rowsPerPage"
                size="small">
                <Column
                  v-for="column in tableData.columns"
                  :key="column.pointer"
                  :field="column.field"
                  :header="column.label"
                  :style="{maxWidth: '200px'}"
                  :sortable="true">
                  <template #body="{data: rowData}">
                    <div
                      v-if="!editMode"
                      :id="cellElementId(cellPath(rowData, column))"
                      class="table-cell-content rounded-sm"
                      :class="{
                        'bg-yellow-200 text-gray-900': isSelectedCell(cellPath(rowData, column)),
                      }"
                      @click="selectTableCell(cellPath(rowData, column))">
                      {{ rowData[column.field] }}
                    </div>
                    <div
                      v-else
                      :id="cellElementId(cellPath(rowData, column))"
                      class="table-cell-content rounded-sm"
                      :class="{'bg-yellow-200': isSelectedCell(cellPath(rowData, column))}"
                      @click="selectTableCell(cellPath(rowData, column))"
                      @focusin="selectTableCell(cellPath(rowData, column))">
                      <TableCellEditor
                        :value="rowData[column.field]"
                        :schema="schemaForColumn(column.path)"
                        :absolutePath="cellPath(rowData, column)"
                        :highlighted="isSelectedCell(cellPath(rowData, column))"
                        :sessionMode="props.sessionMode" />
                    </div>
                  </template>
                </Column>
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
