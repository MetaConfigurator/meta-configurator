<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import {computed, type ComputedRef, onMounted, ref, type Ref} from 'vue';
import {identifyArraysInJson} from '@/utility/arrayPathUtils';
import type {Path} from '@/utility/path';
import {getDataForMode} from '@/data/useDataLink';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ScrollPanel from 'primevue/scrollpanel';
import {jsonPointerToPathTyped, pathToJsonPointer} from '@/utility/pathUtils';
import {
  createItemsRowsFromJson,
  formatJsonPointerAsPropertyName,
  formatJsonPointerForUser,
} from '@/components/panels/list-analysis/listAnalysisUtils';
import TreeTable from 'primevue/treetable';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const data = getDataForMode(props.sessionMode);

onMounted(() => {
  updatePossibleArrays(data.data.value);
});

const possibleArrays: Ref<string[]> = ref([]);

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

const tableData: ComputedRef<null | {rows: any[]; columnNames: string[]}> = computed(() => {
  if (selectedArrayPath.value == null) {
    return null;
  }
  const currentData = data.dataAt(selectedArrayPath.value);
  return createItemsRowsFromJson(currentData);
});

const itemRows = computed(() => {
  console.log('itemRows computed' + tableData.value?.rows);
  return tableData.value?.rows;
});

// function to update the possible arrays based on the data
function updatePossibleArrays(newData: any) {
  possibleArrays.value = identifyArraysInJson(newData, [], true, true).map((path: Path) => {
    return pathToJsonPointer(path);
  });
  if (possibleArrays.value.length == 0) {
    selectedArrayPointer.value = null;
  } else if (possibleArrays.value.length == 1) {
    selectedArrayPointer.value = possibleArrays.value[0];
  } else {
    // if there are multiple arrays, we do not change the selection
  }

  console.log('tableData ', tableData.value);
}
</script>

<template>
  <div>
    <label class="heading">Array Analysis</label>
    <Button
      label="Update Data"
      icon="pi pi-refresh"
      @click="updatePossibleArrays(data.data.value)" />
    <div class="mt-3">
      <div v-if="possibleArrays.length == 0">
        <b>No arrays available.</b>
      </div>
      <div v-else>
        <label for="arrayPath">Select an array to analyze:</label>
        <SelectButton v-model="selectedArrayPointer" :options="possibleArrays" />
      </div>
    </div>

    <div v-if="tableData">
      <ScrollPanel style="width: 100%; height: 100%" aria-orientation="horizontal">
        <DataTable
          :value="selectedArray"
          :paginator="true"
          :rows="20"
          tableStyle="min-width: 50rem"
          showGridlines
          stripedRows
          removable-sort
          scrollable
          scrollHeight="flex"
          class="flex-grow"
          size="small">
          <Column
            v-for="columnName in tableData.columnNames"
            :field="columnName"
            :header="columnName"
            :sortable="true" />
        </DataTable>
      </ScrollPanel>
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
</style>
