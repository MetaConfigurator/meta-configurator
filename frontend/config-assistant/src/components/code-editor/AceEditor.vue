<script setup lang="ts">
import {computed, onMounted, Ref, ref, watchEffect} from 'vue';
import {storeToRefs} from 'pinia';
import type {Editor, Position} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/mode/yaml';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';
import {useDebounceFn, watchArray, watchThrottled} from '@vueuse/core';
import type {Path} from '@/model/path';
import {ConfigManipulatorJson} from '@/components/code-editor/ConfigManipulatorJson';

import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import type {ConfigManipulator} from '@/components/code-editor/ConfigManipulator';
import {ConfigManipulatorYaml} from '@/components/code-editor/ConfigManipulatorYaml';
import {CodeEditorWrapperAce} from '@/components/code-editor/CodeEditorWrapperAce';
import type {CodeEditorWrapper} from '@/components/code-editor/CodeEditorWrapper';
import {useSettingsStore} from '@/store/settingsStore';
import {convertAjvPathToPath} from '@/helpers/pathHelper';

const sessionStore = useSessionStore();
const {currentSelectedElement, fileData} = storeToRefs(sessionStore);

const props = defineProps<{
  dataFormat: string;
}>();

let editor: Ref<Editor>;

let currentSelectionIsForcedFromOutside = false;
const manipulator = createConfigManipulator(props.dataFormat);

let editorWrapper: CodeEditorWrapper;

/**
 * Debounce time for writing changes to store in ms
 */
const WRITE_DEBOUNCE_TIME = 50;
/**
 * Throttle time for reading changes from store in ms
 */
const READ_THROTTLE_TIME = 100;

function createConfigManipulator(dataFormat: string): ConfigManipulator {
  if (dataFormat == 'json') {
    return new ConfigManipulatorJson();
  } else if (dataFormat == 'yaml') {
    return new ConfigManipulatorYaml();
  }
}

onMounted(() => {
  editor = ref(ace.edit('javascript-editor'));
  editorWrapper = new CodeEditorWrapperAce(editor.value);
  sessionStore.currentEditorWrapper = editorWrapper;
  editor.value.$blockScrolling = Infinity;

  const dropElement = document.getElementById('javascript-editor');

  dropElement.addEventListener('dragover', function (e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    // Show as copy
  });

  dropElement.addEventListener('dragenter', function (e) {
    e.stopPropagation();
    e.preventDefault();
    dropElement.classList.add('dragover');
    // show the overlay
  });

  dropElement.addEventListener('dragleave', function (e) {
    e.stopPropagation();
    e.preventDefault();
    if (!dropElement.contains(e.relatedTarget)) {
      dropElement.classList.remove('dragover');
    }
    // hide the overlay
  });

  dropElement.addEventListener('drop', function (e) {
    e.stopPropagation();
    e.preventDefault();
    dropElement.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files && files.length) {
      readFile(files[0]);
    }
  });

  if (props.dataFormat == 'json') {
    editor.value.getSession().setMode('ace/mode/json');
  } else if (props.dataFormat == 'yaml') {
    editor.value.getSession().setMode('ace/mode/yaml');
  }

  watchEffect(() => {
    const fontSize = useSettingsStore().settingsData.codeEditor.fontSize;

    if (editor.value && fontSize) {
      editor.value.setFontSize(fontSize);
    }
  });

  editor.value.setOptions({
    autoScrollEditorIntoView: true, // this is needed if editor is inside scrollable page
  });
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // Feed config data from store into editor
  editorValueWasUpdatedFromOutside(sessionStore.fileData, sessionStore.currentSelectedElement);
  editor.value.getSession().setUndoManager(new ace.UndoManager());

  // Listen to changes on AceEditor and update store accordingly
  editor.value.on(
    'change',
    useDebounceFn(
      () => {
        sessionStore.lastChangeResponsible = ChangeResponsible.CodeEditor;
        const fileContentString = editor.value.getValue();

        try {
          fileData.value = manipulator.parseFileContent(fileContentString);
        } catch (e) {
          // if file content can not be parsed, that is because of error in input
          // Invalid JSON is already highlighted by Ace Editor -> no action needed here
        }
      },
      WRITE_DEBOUNCE_TIME,
      {maxWait: 10 * WRITE_DEBOUNCE_TIME}
    )
  );

  watchArray(
    computed(() => sessionStore.dataValidationResults.errors),
    errors => {
      let annotations = [];
      for (const error of errors) {
        const instancePath = error.instancePath;
        const instancePathTranslated = convertAjvPathToPath(instancePath);
        const relatedRow =
          determineCursorPosition(editor.value.getValue(), instancePathTranslated).row - 1;
        annotations.push({
          row: relatedRow,
          column: 0,
          text: error.message,
          type: 'error',
        });
        editor.value.getSession().setAnnotations(annotations);
      }
    }
  );

  editor.value.on('changeSelection', () => {
    if (currentSelectionIsForcedFromOutside) {
      // we do not need to consider the event and send updates if the selection was forced from outside
      return;
    }
    try {
      let newPath = determinePath(editor.value.getValue(), editor.value.getCursorPosition());
      sessionStore.lastChangeResponsible = ChangeResponsible.CodeEditor;
      sessionStore.currentSelectedElement = newPath;
    } catch (e) {
      /* empty */
    }
  });

  // Listen to changes in store and update content accordingly
  watchThrottled(
    fileData,
    newVal => {
      if (sessionStore.lastChangeResponsible != ChangeResponsible.CodeEditor) {
        editorValueWasUpdatedFromOutside(newVal, sessionStore.currentSelectedElement);
      }
    },
    {deep: true, throttle: READ_THROTTLE_TIME}
  );
  // Listen to changes in current path and update cursor accordingly
  watchThrottled(
    currentSelectedElement,
    newVal => {
      if (editor.value) {
        if (sessionStore.lastChangeResponsible != ChangeResponsible.CodeEditor) {
          currentSelectionIsForcedFromOutside = true;
          updateCursorPositionBasedOnPath(
            editor.value.getValue(),
            sessionStore.currentSelectedElement
          );
          currentSelectionIsForcedFromOutside = false;
        }
      }
    },
    {deep: true, throttle: READ_THROTTLE_TIME}
  );
});

function editorValueWasUpdatedFromOutside(configData, currentPath: Path) {
  // Update value with new data and also update cursor position
  currentSelectionIsForcedFromOutside = true;
  const newEditorContent = manipulator.stringifyContentObject(configData);
  sessionStore.currentEditorWrapper.setContent(newEditorContent);
  updateCursorPositionBasedOnPath(newEditorContent, currentPath);
  currentSelectionIsForcedFromOutside = false;
}

function updateCursorPositionBasedOnPath(editorContent: string, currentPath: Path) {
  let position = determineCursorPosition(editorContent, currentPath);
  editor.value.gotoLine(position.row, position.column);
}

function determineCursorPosition(editorContent: string, currentPath: Path): Position {
  let index = manipulator.determineCursorPosition(editorContent, currentPath);
  return editor.value.session.doc.indexToPosition(index, 0);
}

function determinePath(editorContent: string, cursorPosition: Position): Path {
  let targetCharacter = editor.value.session.doc.positionToIndex(cursorPosition, 0);
  return manipulator.determinePath(editorContent, targetCharacter);
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = function (evt) {
    if (typeof evt.target.result === 'string') {
      editor.value.setValue(evt.target.result, -1);
    } // -1 sets the cursor to the start of the editor
  };
  reader.readAsText(file, 'UTF-8');
}
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped>
.p-component {
  margin: 0 !important;
}

#javascript-editor.dragover::before {
  content: 'Drag and drop here';
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
