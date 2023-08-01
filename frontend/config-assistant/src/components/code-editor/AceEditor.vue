<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {storeToRefs} from 'pinia';
import type {Position} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/mode/yaml';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';
import Ajv2020 from 'ajv/dist/2020';
import {useDebounceFn, watchThrottled} from '@vueuse/core';
import type {Path} from '@/model/path';
import {ConfigManipulatorJson} from '@/helpers/ConfigManipulatorJson';

import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import type {ConfigManipulator} from '@/model/ConfigManipulator';
import {ConfigManipulatorYaml} from '@/helpers/ConfigManipulatorYaml';
import {errorService} from '@/main';

const sessionStore = useSessionStore();
const {currentSelectedElement, fileData} = storeToRefs(sessionStore);

const props = defineProps<{
  dataFormat: string;
}>();
//
const editor = ref();
let currentSelectionIsForcedFromOutside = false;
const manipulator = createConfigManipulator(props.dataFormat);

/**
 * Debounce time for schema validation in ms
 */
const SCHEMA_VALIDATION_DEBOUNCE_TIME = 2000;
/**
 * Debounce time for writing changes to store in ms
 */
const WRITE_DEBOUNCE_TIME = 50;
/**
 * Throttle time for reading changes from store in ms
 */
const READ_THROTTLE_TIME = 100;

const schemaValidationFunction = computed(() => {
  const ajv = new Ajv2020({
    strict: false,
  });
  return ajv.compile(useSessionStore().fileSchemaData);
});

function createConfigManipulator(dataFormat: string): ConfigManipulator {
  if (dataFormat == 'json') {
    return new ConfigManipulatorJson();
  } else if (dataFormat == 'yaml') {
    return new ConfigManipulatorYaml();
  }
}

onMounted(() => {
  editor.value = ace.edit('javascript-editor');

  if (props.dataFormat == 'json') {
    editor.value.getSession().setMode('ace/mode/json');
  } else if (props.dataFormat == 'yaml') {
    editor.value.getSession().setMode('ace/mode/yaml');
  }

  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // Feed config data from store into editor
  editorValueWasUpdatedFromOutside(sessionStore.fileData, sessionStore.currentSelectedElement);

  // Listen to changes on AceEditor and update store accordingly
  editor.value.on(
    'change',
    useDebounceFn(
      () => {
        sessionStore.lastChangeResponsible = ChangeResponsible.CodeEditor;
        const fileContentString = editor.value.getValue();

        try {
          const parsedContent = manipulator.parseFileContent(fileContentString);
          fileData.value = parsedContent;

          validateAgainstSchemaDebounced(parsedContent);
        } catch (e) {
          // if file content can not be parsed, that is because of error in input
          // Invalid JSON is already highlighted by Ace Editor -> no action needed here
        }
      },
      WRITE_DEBOUNCE_TIME,
      {maxWait: 10 * WRITE_DEBOUNCE_TIME}
    )
  );

  const validateAgainstSchemaDebounced = useDebounceFn((parsedContent: any) => {
    try {
      const valid = schemaValidationFunction.value(parsedContent);
      if (valid) {
        useSessionStore().schemaErrorMessage = null;
      } else {
        const errors = schemaValidationFunction.value.errors;
        let annotations = [];
        for (const error of errors) {
          const instancePath = error.instancePath;
          const instancePathTranslated = convertAjvPathToPath(instancePath);
          const relatedRow =
            determineCursorPosition(editor.value.getValue(), instancePathTranslated).row - 1;
          const message = error.message;
          annotations.push({
            row: relatedRow,
            column: 0,
            text: message,
            type: 'warning',
          });
        }
        editor.value.getSession().setAnnotations(annotations);
      }
    } catch (e) {
      useSessionStore().schemaErrorMessage = e.message;
    }
  }, SCHEMA_VALIDATION_DEBOUNCE_TIME);

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

function convertAjvPathToPath(path: string): Path {
  let result = path.split('/');
  if (result.length > 0 && result[0].length == 0) {
    result = result.slice(1);
  }
  return result;
}

function editorValueWasUpdatedFromOutside(configData, currentPath: Path) {
  // Update value with new data and also update cursor position
  currentSelectionIsForcedFromOutside = true;
  const newEditorContent = manipulator.stringifyContentObject(configData);
  editor.value.setValue(newEditorContent);
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
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped>
.p-component {
  margin: 0 !important;
}
</style>
