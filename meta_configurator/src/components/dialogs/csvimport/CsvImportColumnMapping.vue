<script setup lang="ts">
import {CsvImportColumnMappingData} from '@/components/dialogs/csvimport/csvImportTypes';
import InputText from 'primevue/inputtext';

const props = defineProps<{
  columnData: CsvImportColumnMappingData;
}>();
</script>

<template>
  <div class="import-column">
    <span class="fixed-width"
      ><b>{{ props.columnData.name }}: </b></span
    >

    <span>/ </span>

    <InputText v-model="props.columnData.pathBeforeRowIndex" class="fixed-width" />

    <span> /ROW_INDEX/ </span>

    <InputText v-model="props.columnData.pathAfterRowIndex" class="fixed-width" />
  </div>
</template>
<style scoped>
.import-column {
  padding: 20px;
  border: black;
}

.fixed-width {
  display: inline-block;
  width: 200px;
}
</style>
