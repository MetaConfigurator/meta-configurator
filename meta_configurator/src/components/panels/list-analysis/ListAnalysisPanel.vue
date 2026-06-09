<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import {computed, type ComputedRef, ref, type Ref, watch} from 'vue';
import {identifyArraysInJson} from '@/utility/arrayPathUtils';
import type {Path} from '@/utility/path';
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import ToggleButton from 'primevue/togglebutton';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import {arePathsEqual, jsonPointerToPathTyped, pathToJsonPointer} from '@/utility/pathUtils';
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

function selectTableCell(path: Path) {
  session.updateCurrentSelectedElement(path);
}

function isSelectedCell(path: Path): boolean {
  return arePathsEqual(session.currentSelectedElement.value, path);
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
              <span style="display: inline-block; width: 20px"></span>
              <ToggleButton
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
                showGridlines
                stripedRows
                resizable-columns
                removable-sort
                paginator
                :rows="30"
                size="small">
                <Column
                  v-for="column in tableData.columns"
                  :key="column.pointer"
                  :field="column.field"
                  :header="column.label"
                  :style="{maxWidth: '200px'}"
                  :sortable="true">
                  <template #body="{data}">
                    <div
                      v-if="!editMode"
                      class="table-cell-content"
                      :class="{
                        'bg-yellow-50 rounded-sm': isSelectedCell(
                          selectedArrayPath
                            ? [...selectedArrayPath, data.__originalIndex, ...column.path]
                            : column.path
                        ),
                      }"
                      @click="
                        selectTableCell(
                          selectedArrayPath
                            ? [...selectedArrayPath, data.__originalIndex, ...column.path]
                            : column.path
                        )
                      ">
                      {{ data[column.field] }}
                    </div>
                    <div
                      v-else
                      class="table-cell-content"
                      :class="{
                        'bg-yellow-50 rounded-sm': isSelectedCell(
                          selectedArrayPath
                            ? [...selectedArrayPath, data.__originalIndex, ...column.path]
                            : column.path
                        ),
                      }"
                      @click="
                        selectTableCell(
                          selectedArrayPath
                            ? [...selectedArrayPath, data.__originalIndex, ...column.path]
                            : column.path
                        )
                      "
                      @focusin="
                        selectTableCell(
                          selectedArrayPath
                            ? [...selectedArrayPath, data.__originalIndex, ...column.path]
                            : column.path
                        )
                      ">
                      <TableCellEditor
                        :value="data[column.field]"
                        :schema="schemaForColumn(column.path)"
                        :absolutePath="
                          selectedArrayPath
                            ? [...selectedArrayPath, data.__originalIndex, ...column.path]
                            : column.path
                        "
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
