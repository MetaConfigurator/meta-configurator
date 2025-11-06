<!-- Dialog to select the initial schema -->
<script setup lang="ts">
import {type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Listbox from 'primevue/listbox';
import type {SchemaOption} from '@/packaged-schemas/schemaOption';
import {fetchSchemaFromUrl} from '@/components/toolbar/fetchSchemaFromUrl';
import {openClearDataEditorDialog} from '@/components/toolbar/clearFile';
import {useErrorService} from '@/utility/errorServiceInstance';

const showDialog = ref(false);

const fetchedSchemas: Ref<SchemaOption[]> = ref([]);
const selectedSchema = ref<SchemaOption | null>(null);

watch(selectedSchema, async newSelectedSchema => {
  if (!newSelectedSchema) {
    return;
  }
  if (newSelectedSchema.url) {
    try {
      await fetchSchemaFromUrl(newSelectedSchema.url);
      hideDialog();
      openClearDataEditorDialog();
    } catch (error) {
      useErrorService().onError(error);
    }
  } else if (newSelectedSchema.key) {
    useErrorService().onError(
      new Error(`Fetching schema by key is currently not supported: ${newSelectedSchema.key}`)
    );
  }
});

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function setFetchedSchemas(schemas: SchemaOption[]) {
  fetchedSchemas.value = schemas;
}

defineExpose({show: openDialog, close: hideDialog, setSchemas: setFetchedSchemas});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Select a Schema">
    <div class="card flex justify-content-center">
      <div class="listbox-container" style="width: 300px">
        <Listbox
          listStyle="max-height: 250px"
          v-model="selectedSchema"
          :options="fetchedSchemas"
          filter
          optionLabel="label"
          class="overflow-hidden">
        </Listbox>
      </div>
    </div>
  </Dialog>
</template>
<style scoped>
.listbox-container {
  width: 100%;
}
</style>
