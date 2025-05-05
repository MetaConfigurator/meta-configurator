<!--
 Code Editor component based on Ace Editor. Supports different data formats.
 Synchronized with file data from the store.
 -->
<script setup lang="ts">
import {onMounted, ref, type Ref, watch} from 'vue';
import { from_json_schema, convert_to, Templates} from 'mdmodels';
import {useSettings} from '@/settings/useSettings';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from "@/data/useDataLink";

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const settings = useSettings();
const modelText: Ref<string> = ref('');

const changeOrigin = ref(0); // 0: no change. Negative: change through the markdown editor. Positive: change through the JSON schema

// watch modelText and update the data in the store if it changes
watch(modelText, (mdModelText) => {
  changeOrigin.value--;
  console.log('modelText', mdModelText);
  if (!mdModelText || changeOrigin.value == 0) {
    return;
  }
  const jsonSchemaString = convert_to(mdModelText, Templates.JsonSchema);
  console.log('jsonSchema', jsonSchemaString);
  getDataForMode(SessionMode.SchemaEditor).setData(JSON.parse(jsonSchemaString));
});


// watch current schema and update the modelText if it changes
watch(getDataForMode(SessionMode.SchemaEditor).data, (jsonSchema) => {
  changeOrigin.value++;
  console.log('schema', jsonSchema);
  if (!jsonSchema || changeOrigin.value == 0) {
    return;
  }
  const dataModel = from_json_schema(jsonSchema);
  const mdModelText = convert_to(dataModel, Templates.Markdown);
  modelText.value = mdModelText;
});

onMounted(() => {
});



</script>

<template>
      <textarea
          v-model="modelText"
          :style="{ width: '50%', height: '200px' }"
  />
</template>

<style scoped></style>
