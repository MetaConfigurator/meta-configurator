<!-- Dialog to Infer Schema from multiple files -->
<script setup lang="ts">
import {type Ref, ref} from 'vue';
import Dialog from 'primevue/dialog';
import {inferSchema} from '@jsonhero/schema-infer';

const showDialog = ref(false);

// files can be either a JSON/XML/YAML document or the URL to such a file
// start with two example JSON documents
const inputFiles: Ref<string[]> = ref([
    "{\n" +
    "  \"diet\": \"carnivore\",\n" +
    "  \"name\": \"Wolf\",\n" +
    "  \"habitat\": \"forest\",\n" +
    "  \"prey\": \"Deer\"\n" +
    "}",
    "{\n" +
    "  \"diet\": \"herbivore\",\n" +
    "  \"name\": \"Cow\",\n" +
    "  \"habitat\": \"grassland\",\n" +
    "  \"plants\": [\n" +
    "    \"Grass\",\n" +
    "    \"Hay\",\n" +
    "    \"Corn\"\n" +
    "  ]\n" +
    "}"
]);


function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function requestInferSchema() {

  const schema = inferSchema(inputFiles.value);
  if (schema) {
    infoString.value = 'Schema successfully inferred';
    errorString.value = '';
    resultSchema.value = JSON.stringify(schema, null, 2);
  } else {
    errorString.value = 'Failed to infer schema';
    infoString.value = '';
    resultSchema.value = '';
  }

}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Infer Schema From Multiple Files">
    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">

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
</style>
