<!-- Dialog to convert data to target schema using hybrid approach with AI -->
<script setup lang="ts">
import {type Ref, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {queryDataMappingConfig} from '@/utility/openai';
import {fixAndParseGeneratedJson, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {
  DATA_MAPPING_EXAMPLE_CONFIG,
  DATA_MAPPING_SCHEMA,
} from '@/packaged-schemas/dataMappingSchema';
import {performDataMapping} from '@/data-mapping/performDataMapping';
import type {DataMappingConfig} from '@/data-mapping/dataMappingTypes';
import {sanitizeMappingConfiguration} from '@/data-mapping/sanitizeMappingConfiguration';
import {extractSuitableSourcePaths} from '@/data-mapping/extractPathsFromDocument';

const showDialog = ref(false);

const statusMessage: Ref<string> = ref('');
const errorMessage: Ref<string> = ref('');
const userComments: Ref<string> = ref('');

const resultMapping: Ref<any> = ref({});
const resultMappingStr: Ref<string> = ref('');

function openDialog() {
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function generateMappingSuggestion() {
  const inputData = getDataForMode(SessionMode.DataEditor).data.value;
  const targetSchema = getDataForMode(SessionMode.SchemaEditor).data.value;

  statusMessage.value = 'Reducing input data for efficiency...';
  const inputDataSubset = cutDataTo3EntriesPerArray(inputData);
  console.log(
    'Reduced input data from ' +
      JSON.stringify(inputData).length / 1024 +
      ' KB to ' +
      JSON.stringify(inputDataSubset).length / 1024 +
      ' KB'
  );

  // infer schema for input data
  statusMessage.value = 'Inferring schema for input data...';
  const inputFileSchema = inferJsonSchema(inputDataSubset);

  const apiKey = getApiKey();
  statusMessage.value = 'Generating data mapping suggestion...';

  const possibleSourcePaths = extractSuitableSourcePaths(inputData);

  const dataMappingSchemaStr = JSON.stringify(DATA_MAPPING_SCHEMA);
  const dataMappingExampleStr = JSON.stringify(DATA_MAPPING_EXAMPLE_CONFIG);
  const inputFileSchemaStr = JSON.stringify(inputFileSchema);
  const targetSchemaStr = JSON.stringify(targetSchema);
  const inputDataSubsetStr = JSON.stringify(inputDataSubset);
  console.log(
    'Sizes of the different input files in KB:' +
      ' dataMappingSchema: ' +
      (dataMappingSchemaStr.length / 1024).toFixed(2) +
      ' inputFileSchema: ' +
      (inputFileSchemaStr.length / 1024).toFixed(2) +
      ' targetSchema: ' +
      (targetSchemaStr.length / 1024).toFixed(2) +
      ' inputDataSubset: ' +
      (inputDataSubsetStr.length / 1024).toFixed(2)
  );
  const resultPromise = queryDataMappingConfig(
    apiKey,
    dataMappingSchemaStr,
    dataMappingExampleStr,
    inputFileSchemaStr,
    targetSchemaStr,
    inputDataSubsetStr,
    possibleSourcePaths,
    userComments.value
  );

  resultPromise.then(responseStr => {
    const responseJson = fixAndParseGeneratedJson(responseStr); // TODO: move out fixAndParse to a generic library place or even update whole aiUtils file
    // write the response to the resultMapping variable, also prettify it
    resultMapping.value = responseJson;

    const inputData = getDataForMode(SessionMode.DataEditor).data.value;
    const validationResult = sanitizeMappingConfiguration(resultMapping.value, inputData);
    if (validationResult.length == 0) {
      resultMappingStr.value = JSON.stringify(responseJson, null, 2);
      statusMessage.value = 'Data mapping suggestion generated successfully.';
    } else {
      resultMappingStr.value = '';
      statusMessage.value = validationResult;
    }
  });
}

function cutDataTo3EntriesPerArray(data: any): any {
  // data will be a json object or array with an arbitrary hierarchy and anywhere could be arrays
  // we want to cut each array to have only 3 entries

  // check if data is an array. Even then, children coudl be objects or arrays. Apply same algorithm recursively on each array item
  if (Array.isArray(data)) {
    const newArray = [];
    let i = 0;
    for (const item of data) {
      // if the array has more than 3 entries, cut it to 3 entries
      if (i < 3) {
        i++;
      } else {
        break;
      }
      newArray.push(cutDataTo3EntriesPerArray(item));
    }
    return newArray;
  }

  // if data is an object, we need to traverse the object and cut each array to have only 3 entries
  if (typeof data === 'object' && data !== null) {
    const newObject: any = {};
    for (const key in data) {
      newObject[key] = cutDataTo3EntriesPerArray(data[key]);
    }
    return newObject;
  }
  // if data is not an object or array, return it as is
  return data;
}

function isResultMappingValid() {
  return resultMappingStr.value.length > 0;
}

function performMapping() {
  if (!isResultMappingValid()) {
    throw new Error('Can not perform data mapping with invalid mapping config.');
  }

  statusMessage.value = 'Performing data mapping...';

  const mapping = resultMapping.value as DataMappingConfig;
  const resultData = performDataMapping(getDataForMode(SessionMode.DataEditor).data.value, mapping);
  // write the result data to the data editor
  getDataForMode(SessionMode.DataEditor).setData(resultData);
  statusMessage.value = 'Data mapping performed successfully.';
  hideDialog();
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Convert Data to Target Schema">
    <ApiKey />

    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
      <p>
        This will convert the data to the target schema using a hybrid approach with AI. The AI will
        suggest a mapping between the input data and the target schema.
      </p>
      <div class="vertical-center">
        <label for="userComments">Data Mapping Remarks:</label>
        <InputText id="userComments" v-model="userComments" class="ml-2" />
        <Button label="Generate Mapping Suggestion" @click="generateMappingSuggestion" />
      </div>

      <div v-if="resultMappingStr.length > 0">
        <Message severity="success">
          <p>Data Mapping Suggestion:</p>
          <pre>{{ resultMappingStr }}</pre>
        </Message>

        <Button label="Perform Mapping" @click="performMapping" />
      </div>

      <Message severity="info" v-if="statusMessage.length > 0">{{ statusMessage }}</Message>
      <Message severity="error" v-if="errorMessage.length > 0">{{ errorMessage }}</Message>
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
