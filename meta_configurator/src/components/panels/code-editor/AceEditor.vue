<!--
 Code Editor component based on Ace Editor. Supports different data formats.
 Synchronized with file data from the store.
 -->
<script setup lang="ts">
import {onMounted} from 'vue';
import type {Editor} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/mode/yaml';
import 'brace/mode/xml';
import 'brace/theme/clouds';
import 'brace/theme/clouds_midnight';
import {setupAnnotationsFromValidationErrors} from '@/components/panels/code-editor/setupAnnotations';
import {
  setupLinkToCurrentSelection,
  setupLinkToData,
} from '@/components/panels/code-editor/setupLinkToSelectionAndData';
import {useSettings} from '@/settings/useSettings';
import {SessionMode} from '@/store/sessionMode';
import {setupAceMode, setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import Select from 'primevue/select';
import {formatRegistry} from '@/dataformats/formatRegistry';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const settings = useSettings();

const dataFormatOptions = formatRegistry.getFormatNames();

// random id is used to enable multiple Ace Editors of same sessionMode on the same page
const editor_id = 'code-editor-' + props.sessionMode + '-' + Math.random();

onMounted(() => {
  const editor: Editor = ace.edit(editor_id);
  setupAceMode(editor, settings.value);
  setupAceProperties(editor, settings.value);

  setupLinkToData(editor, props.sessionMode);
  setupLinkToCurrentSelection(editor, props.sessionMode);
  setupAnnotationsFromValidationErrors(editor, props.sessionMode);
});
</script>

<template>
  <div class="format-switch-container" v-if="settings.codeEditor.showFormatSelector">
    <Select :options="dataFormatOptions" v-model="settings.dataFormat" size="small" />
  </div>
  <div class="h-full" :id="editor_id" />
</template>

<style scoped>
.format-switch-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
