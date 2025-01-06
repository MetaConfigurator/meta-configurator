<!--
 Code Editor component based on Ace Editor. Supports different data formats.
 Synchronized with file data from the store.
 -->
<script setup lang="ts">
import {onMounted, ref, type Ref} from 'vue';
import { parse_model, validate } from 'mdmodels-core';
import {watchImmediate} from '@vueuse/core';
import {setupAnnotationsFromValidationErrors} from '@/components/panels/code-editor/setupAnnotations';
import {
  setupLinkToCurrentSelection,
  setupLinkToData,
} from '@/components/panels/code-editor/setupLinkToSelectionAndData';
import {useSettings} from '@/settings/useSettings';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from "@/data/useDataLink";

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const settings = useSettings();
const modelText: Ref<string> = ref('');


onMounted(() => {
});


function handleModelChange(e: any) {
  const newText = e.target.value;
  modelText.value = newText;
  const jsonSchema = parse_model(newText);
  getDataForMode(SessionMode.SchemaEditor).setData(jsonSchema);

};

</script>

<template>
      <textarea
          :value=modelText
          :onChange=handleModelChange
          :style="{ width: '50%', height: '200px' }"
  />
</template>

<style scoped></style>
