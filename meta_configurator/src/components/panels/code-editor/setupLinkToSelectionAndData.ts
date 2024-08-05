import type {Editor} from 'brace';
import {useDataConverter} from '@/dataformats/formatRegistry';
import type {Path} from '@/utility/path';
import {useDebounceFn, watchArray} from '@vueuse/core';
import _ from 'lodash';
import {
  determinePath,
  updateCursorPositionBasedOnPath,
} from '@/components/panels/code-editor/aceUtility';
import type {SessionMode} from '@/store/sessionMode';
import {getDataForMode, getSessionForMode} from '@/data/useDataLink';
import {watchImmediate} from '@vueuse/core/index';

// variables to prevent updating functions to trigger each other
let selectionChangeFromOutside = false;
let selectionChangeFromInside = false;

let currentChangeFromOutside = false;
let currentChangeFromInside = false;

export function setupLinkToCurrentSelection(editor: Editor, mode: SessionMode) {
  setupCursorPositionToSelectedPath(editor, mode);
  setupSelectedPathToCursorPosition(editor, mode);
}

/**
 * When the user clicks into the editor, we want to use the cursor position to determine which element from the data
 * the user clicked at. We then update the currentSelectedElement in the store accordingly.
 * @param editor the ace editor
 */
function setupCursorPositionToSelectedPath(editor: Editor, mode: SessionMode) {
  editor.on(
    'changeSelection',
    useDebounceFn(() => {
      if (selectionChangeFromOutside) {
        selectionChangeFromOutside = false;
        // we do not need to consider the event and send updates if the selection was forced from outside
        return;
      }
      if (!useDataConverter().isValidSyntax(editor.getValue())) {
        // do not attempt to determine the path when the text does not have valid syntax
        return;
      }
      try {
        const newPath = determinePath(editor);
        const session = getSessionForMode(mode);
        if (!_.isEqual(session.currentSelectedElement.value, newPath)) {
          selectionChangeFromInside = true;
          session.currentSelectedElement.value = newPath;
        }
      } catch (e) {
        /* empty */
      }
    }, 100)
  );
}

/**
 * Listens to changes in the currentSelectedElement and update the cursor position accordingly.
 * @param editor the ace editor
 */
function setupSelectedPathToCursorPosition(editor: Editor, mode: SessionMode) {
  watchArray(
    () => getSessionForMode(mode).currentSelectedElement.value,
    (newSelectedElement: Path) => {
      if (selectionChangeFromInside) {
        selectionChangeFromInside = false;
        return;
      }
      selectionChangeFromOutside = true;
      updateCursorPositionBasedOnPath(editor, newSelectedElement);
    }
  );
}

export function setupLinkToData(editor: Editor, mode: SessionMode) {
  setupUpdateContentWhenDataChanges(editor, mode);
  setupPropagationOfEditorContentChanges(editor, mode);
}

function setupUpdateContentWhenDataChanges(editor: Editor, mode: SessionMode) {
  watchImmediate(
    () => getDataForMode(mode).unparsedData.value,
    (dataString: string) => {
      if (currentChangeFromInside) {
        currentChangeFromInside = false; // reset flag
        return;
      }

      if (dataString != editor.getValue()) {
        currentChangeFromOutside = true;
        selectionChangeFromOutside = true;
        // TODO: check if every setValue will lead to selection change, or change data without changing selection
        editor.setValue(dataString, -1);
      }
    }
  );
}

/**
 * When the content of the editor is modified by the user, we want to update the file data accordingly
 * @param editor the ace editor
 */
function setupPropagationOfEditorContentChanges(editor: Editor, mode: SessionMode) {
  editor.on(
    'change',
    useDebounceFn(() => {
      if (currentChangeFromOutside) {
        currentChangeFromOutside = false; // reset flag
        return;
      }

      currentChangeFromInside = true;
      getDataForMode(mode).unparsedData.value = editor.getValue();
    }, 100)
  );
}
