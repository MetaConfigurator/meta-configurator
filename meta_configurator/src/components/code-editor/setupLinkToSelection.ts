import type {Editor} from 'brace';
import {useSessionStore} from '@/store/sessionStore';
import {useDataConverter} from '@/dataformats/formatRegistry';
import type {Path} from '@/utility/path';
import {useDebounceFn, watchArray} from '@vueuse/core';
import _ from 'lodash';
import {determinePath, updateCursorPositionBasedOnPath} from '@/components/code-editor/aceUtility';

// variables to prevent updating functions to trigger each other
let selectionChangeFromOutside = false;
let selectionChangeFromInside = false;

export function setupLinkToCurrentSelection(editor: Editor) {
  setupCursorPositionToSelectedPath(editor);
  setupSelectedPathToCursorPosition(editor);
}

/**
 * When the user clicks into the editor, we want to use the cursor position to determine which element from the data
 * the user clicked at. We then update the currentSelectedElement in the store accordingly.
 * @param editor the ace editor
 */
function setupCursorPositionToSelectedPath(editor: Editor) {
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
        const sessionStore = useSessionStore();
        if (!_.isEqual(sessionStore.currentSelectedElement, newPath)) {
          selectionChangeFromInside = true;
          sessionStore.currentSelectedElement = newPath;
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
function setupSelectedPathToCursorPosition(editor: Editor) {
  watchArray(
    () => useSessionStore().currentSelectedElement,
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
