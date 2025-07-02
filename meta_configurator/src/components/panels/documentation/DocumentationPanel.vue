<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import {computed, type ComputedRef, onMounted, ref, type Ref, watch} from 'vue';
import {identifyArraysInJson} from '@/utility/arrayPathUtils';
import type {Path} from '@/utility/path';
import {getDataForMode} from '@/data/useDataLink';
import {schemaToMarkdown} from '@/utility/documentation/schemaToMarkdown'
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

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const schemaData = getDataForMode(SessionMode.SchemaEditor);

</script>

<template>
  <div class="ml-5 h-full">
    <label class="heading">Documentation View</label>

    <Textarea > {{schemaToMarkdown(schemaData.data.value)}}  </Textarea>

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
