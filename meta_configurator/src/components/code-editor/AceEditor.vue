<!--
 Code Editor component based on Ace Editor. Supports different data formats.
 Synchronized with file data from the store.
 -->
<script setup lang="ts">
import {computed, onMounted, type Ref, ref, watch, watchEffect} from 'vue';
import {storeToRefs} from 'pinia';
import type {Editor, Position} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/mode/yaml';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';
import _ from 'lodash';
import {useDebounceFn, watchArray} from '@vueuse/core';
import type {Path} from '@/model/path';

import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {CodeEditorWrapperAce} from '@/components/code-editor/codeEditorWrapperAce';
import type {CodeEditorWrapper} from '@/components/code-editor/codeEditorWrapper';
import {useSettingsStore} from '@/store/settingsStore';
import {convertAjvPathToPath} from '@/utility/pathUtils';
import {useDataConverter, usePathIndexLink} from '@/formats/formatRegistry';

const sessionStore = useSessionStore();
const {currentSelectedElement, fileData} = storeToRefs(sessionStore);

const props = defineProps<{
  dataFormat: string;
}>();

let editor: Ref<Editor>;

let currentChangeForcedFromOutside = false;
let editorWrapper: CodeEditorWrapper;

/**
 * Debounce time for writing changes to store in ms
 */
const WRITE_DEBOUNCE_TIME = 100;

const editorDiv = ref();

function onDragOver(e: DragEvent) {
  e.stopPropagation();
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
}

function onDragEnter() {
  editorDiv.value.classList.add('dragover');
}

function onDragLeave(e: DragEvent) {
  if (!editorDiv.value.contains(e.relatedTarget)) {
    editorDiv.value.classList.remove('dragover');
  }
}

function onDrop(e: DragEvent) {
  e.stopPropagation();
  e.preventDefault();
  editorDiv.value.classList.remove('dragover');
  const files = e.dataTransfer?.files;
  if (files && files.length == 1) {
    readFile(files[0]);
  }
  if (files && files.length > 1) {
    alert('Please drop only one file at a time');
  }
}

onMounted(() => {
  editor = ref(ace.edit('javascript-editor'));
  editorWrapper = new CodeEditorWrapperAce(editor.value);
  sessionStore.currentEditorWrapper = editorWrapper;
  editor.value.$blockScrolling = Infinity;

  // change the mode depending on the data format.
  // to support new data formats, they need to be added here too.
  if (props.dataFormat == 'json') {
    editor.value.getSession().setMode('ace/mode/json');
  } else if (props.dataFormat == 'yaml') {
    editor.value.getSession().setMode('ace/mode/yaml');
  }

  watchEffect(() => {
    const fontSize = useSettingsStore().settingsData.codeEditor.fontSize;

    if (editor.value && fontSize) {
      editor.value.setFontSize(fontSize.toString() + 'px');
    }
  });

  editor.value.setOptions({
    autoScrollEditorIntoView: true, // this is needed if editor is inside scrollable page
  });
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // feed config data from store into editor
  editorValueWasUpdatedFromOutside(sessionStore.fileData, sessionStore.currentSelectedElement);
  editor.value.getSession().setUndoManager(new ace.UndoManager());

  // when the content of the editor is modified by the user, we want to update the file data in the store accordingly
  editor.value.on(
    'change',
    useDebounceFn(
      () => {
        sessionStore.editorContentUnparsed = editor.value.getValue();

        if (currentChangeForcedFromOutside) {
          currentChangeForcedFromOutside = false; // reset flag
          return;
        }

        sessionStore.lastChangeResponsible = ChangeResponsible.CodeEditor;
        const fileContentString = editor.value.getValue();

        useDataConverter().parseIfValid(fileContentString, data => {
          sessionStore.fileData = data;
        });
      },
      WRITE_DEBOUNCE_TIME,
      {maxWait: 10 * WRITE_DEBOUNCE_TIME}
    )
  );

  watch(
    computed(() => sessionStore.editorContentUnparsed),
    content => {
      if (useSessionStore().lastChangeResponsible != ChangeResponsible.CodeEditor) {
        editor.value.setValue(content, -1);
      }
    }
  );

  watchArray(
    computed(() => sessionStore.dataValidationResults.errors),
    errors => {
      // do not attempt to display schema validation errors when the text does not have valid syntax
      // (would otherwise result in errors when trying to parse CST)
      if (!useDataConverter().isValidSyntax(editor.value.getValue())) {
        return;
      }

      let annotations = [];
      for (const error of errors) {
        const instancePath = error.instancePath;
        const instancePathTranslated = convertAjvPathToPath(instancePath);
        const relatedRow =
          determineCursorPosition(editor.value.getValue(), instancePathTranslated).row - 1;
        annotations.push({
          row: relatedRow,
          column: 0,
          text: error.message ?? 'Validation error',
          type: 'error',
        });
        editor.value.getSession().setAnnotations(annotations);
      }
    }
  );

  // when the user clicks into the editor, we want to use the cursor position to determine which element from the data
  // the user clicked at. We then update the currentSelectedElement in the store accordingly.
  editor.value.on('changeSelection', () => {
    if (currentChangeForcedFromOutside) {
      // we do not need to consider the event and send updates if the selection was forced from outside
      return;
    }
    try {
      let newPath = determinePath(editor.value.getValue(), editor.value.getCursorPosition());
      if (!_.isEqual(sessionStore.currentSelectedElement, newPath)) {
        sessionStore.lastChangeResponsible = ChangeResponsible.CodeEditor;
        sessionStore.currentSelectedElement = newPath;
      }
    } catch (e) {
      /* empty */
    }
  });

  // listen to changes in store and update the editor content accordingly
  watch(
    fileData,
    newVal => {
      if (sessionStore.lastChangeResponsible != ChangeResponsible.CodeEditor) {
        editorValueWasUpdatedFromOutside(newVal, sessionStore.currentSelectedElement);
      }
    },
    {deep: true}
  );
  // listen to changes in current path and update cursor accordingly
  watch(
    currentSelectedElement,
    (newSelectedElement: Path) => {
      if (editor.value && sessionStore.lastChangeResponsible != ChangeResponsible.CodeEditor) {
        currentChangeForcedFromOutside = true;
        updateCursorPositionBasedOnPath(editor.value.getValue(), newSelectedElement);
        currentChangeForcedFromOutside = false;
      }
    },
    {deep: true}
  );
});

function editorValueWasUpdatedFromOutside(configData: any, currentPath: Path) {
  // update value with new data and also update cursor position
  currentChangeForcedFromOutside = true;
  const newEditorContent = useDataConverter().stringify(configData);
  sessionStore.currentEditorWrapper.setContent(newEditorContent);
  updateCursorPositionBasedOnPath(newEditorContent, currentPath);
  // set currentChangeForcedFromOutside to false in on-change handler
}

function updateCursorPositionBasedOnPath(editorContent: string, currentPath: Path) {
  const position = determineCursorPosition(editorContent, currentPath);
  editor.value.gotoLine(position.row + 1, position.column, true); // row is 1-based, column is 0-based
}

function determineCursorPosition(editorContent: string, currentPath: Path): Position {
  const index = usePathIndexLink().determineIndexOfPath(editorContent, currentPath);
  return editor.value.session.doc.indexToPosition(index, 0);
}

function determinePath(editorContent: string, cursorPosition: Position): Path {
  const targetCharacter = editor.value.session.doc.positionToIndex(cursorPosition, 0);
  return usePathIndexLink().determinePathFromIndex(editorContent, targetCharacter);
}

function readFile(file: any) {
  const reader = new FileReader();
  reader.onload = function (evt) {
    if (typeof evt.target?.result === 'string') {
      editor.value.setValue(evt.target.result, -1);
    } // -1 sets the cursor to the start of the editor
  };
  reader.readAsText(file, 'UTF-8');
}
</script>

<template>
  <div
    class="h-full"
    id="javascript-editor"
    ref="editorDiv"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop="onDrop" />
</template>

<style scoped>
.p-component {
  margin: 0 !important;
}

#javascript-editor.dragover::before {
  content: 'Drag and drop files here';
  font-size: 24px;
  color: #666;
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  background: rgba(255, 255, 255, 0.8);
  padding: 20px;
  border-radius: 10px;
  border: 2px dashed #666;
}
</style>
