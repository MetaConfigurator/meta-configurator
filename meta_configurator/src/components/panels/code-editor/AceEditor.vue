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
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';
import {watchImmediate} from '@vueuse/core';
import {setupAnnotationsFromValidationErrors} from '@/components/panels/code-editor/setupAnnotations';
import {setupLinkToCurrentSelection} from '@/components/panels/code-editor/setupLinkToSelection';
import {useSettings} from '@/settings/useSettings';
import {setupLinkToData} from '@/components/panels/code-editor/setupLinkToData';
import {SessionMode} from '@/store/sessionMode';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

// random id is used to enable multiple Ace Editors of same sessionMode on the same page
const editor_id = 'code-editor-' + props.sessionMode + '-' + Math.random();

onMounted(() => {
  const editor: Editor = ace.edit(editor_id);
  setupAceMode(editor);
  setupAceProperties(editor);

  setupLinkToData(editor, props.sessionMode);
  setupLinkToCurrentSelection(editor, props.sessionMode);
  setupAnnotationsFromValidationErrors(editor, props.sessionMode);
});

/**
 * change the mode depending on the data format.
 * to support new data formats, they need to be added here too.
 */
function setupAceMode(editor: Editor) {
  watchImmediate(
    () => useSettings().dataFormat,
    format => {
      if (format == 'json') {
        editor.getSession().setMode('ace/mode/json');
      } else if (format == 'yaml') {
        editor.getSession().setMode('ace/mode/yaml');
      }
    }
  );
}

function setupAceProperties(editor: Editor) {
  editor.$blockScrolling = Infinity;
  editor.setOptions({
    autoScrollEditorIntoView: true, // this is needed if editor is inside scrollable page
  });
  editor.setTheme('ace/theme/clouds');
  editor.setShowPrintMargin(false);

  // it's not clear why timeout is needed here, but without it the
  // ace editor starts flashing and becomes unusable
  window.setTimeout(() => {
    watchImmediate(
      () => useSettings().codeEditor.fontSize,
      fontSize => {
        if (editor && fontSize && fontSize > 6 && fontSize < 65) {
          editor.setFontSize(fontSize.toString() + 'px');
        }
      }
    );
  }, 0);
}
</script>

<template>
  <div class="h-full" :id="editor_id" />
</template>

<style scoped></style>
