<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
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

import {ChangeResponsible, SessionMode, useSessionStore} from '@/store/sessionStore';
import type {ConfigManipulator} from '@/model/ConfigManipulator';
import {ConfigManipulatorYaml} from '@/helpers/ConfigManipulatorYaml';
import {useSettingsStore} from '@/store/settingsStore';
import {errorService} from '@/main';

const sessionStore = useSessionStore();
const {currentSelectedElement, fileData} = storeToRefs(sessionStore);

const props = defineProps<{
  dataFormat: string;
}>();

const editor = ref();
let currentSelectionIsForcedFromOutside = false;
const manipulator = createConfigManipulator(props.dataFormat);

const schemaValidationFunction = computed(() => {
  const ajv = new Ajv2020({
    strict: false,
    strictRequired: true,
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

        // Current workaround until schema of schema editor works: just accept schema without validation
        //fileData.value = JSON.parse(jsonString);
        if (sessionStore.currentMode === SessionMode.SchemaEditor) {
          try {
            fileData.value = manipulator.parseFileContent(fileContentString);
          } catch (e) {
            errorService.onErrorThrottled(e);
          }
          return;
        }

        try {
          const parsedContent = manipulator.parseFileContent(fileContentString);
          if (useSettingsStore().settingsData.codeEditor.allowSchemaViolatingInput) {
            fileData.value = parsedContent;
          }
          validateAgainstSchemaDebounced(parsedContent)
            .then(valid => {
              if (valid) {
                fileData.value = parsedContent;
              } else {
                errorService.onWarningThrottled(new Error('Invalid JSON according to the schema.'));
                //TODO: more detailed error message
              }
            })
            .catch(e => errorService.onErrorThrottled(e));
        } catch (e) {
          // Do nothing: showing the parse error in the editor is enough
        }
      },
      50,
      {maxWait: 500}
    )
  );

  const validateAgainstSchemaDebounced = useDebounceFn(
    (parsedContent: any) => {
      return schemaValidationFunction.value(parsedContent);
    },
    5000,
    {maxWait: 10_000}
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
    {deep: true, throttle: 100}
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
    {deep: true, throttle: 100}
  );
});

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
