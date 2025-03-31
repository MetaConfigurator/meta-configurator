<!--
 Code Editor component based on Ace Editor. Supports different data formats.
 Synchronized with file data from the store.
 -->
<script setup lang="ts">
import {onMounted, watch} from 'vue';
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
import Message from 'primevue/message';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const settings = useSettings();

// random id is used to enable multiple Ace Editors of same sessionMode on the same page
const editor_id = 'code-editor-' + props.sessionMode + '-' + Math.random();

onMounted(() => {
  const editor: Editor = ace.edit(editor_id);
  setupAceMode(editor, settings.value);
  setupAceProperties(editor, settings.value);

  setupLinkToData(editor, props.sessionMode);
  setupLinkToCurrentSelection(editor, props.sessionMode);
  setupAnnotationsFromValidationErrors(editor, props.sessionMode);

  if (isEditorReadOnly()) {
    editor.setReadOnly(true);
  }
});

// watch for changes in the data format and update the editor accordingly
watch(
  () => settings.value.dataFormat,
  _ => {
    const editor: Editor = ace.edit(editor_id);
    editor.setReadOnly(isEditorReadOnly());
  }
);

function isEditorReadOnly(): boolean {
  const dataFormat = settings.value.dataFormat;
  const mode = props.sessionMode;

  // if the editor is in schema mode, XML is in read only because it will mess up the structure
  return mode === SessionMode.SchemaEditor && dataFormat === 'xml';
}
</script>

<template>
  <Message v-if="isEditorReadOnly()" severity="warn"
    >Read-Only Mode: Schema Text Editor does not support XML, because it will lead to unwanted
    changes in the structure.</Message
  >
  <div class="h-full" :id="editor_id" />
</template>

<style scoped></style>
