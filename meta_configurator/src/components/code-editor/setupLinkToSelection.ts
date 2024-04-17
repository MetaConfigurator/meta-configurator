import type {Editor} from 'brace';
import {useSessionStore} from '@/store/sessionStore';
import {useDataConverter} from '@/dataformats/formatRegistry';
import type {Path} from '@/utility/path';
import {useDebounceFn, watchArray} from '@vueuse/core';
import _ from 'lodash';
import {determinePath, updateCursorPositionBasedOnPath} from '@/components/code-editor/aceUtility';
import type {SessionMode} from '@/store/sessionMode';
import {getSessionForMode} from '@/data/useDataLink';

// variables to prevent updating functions to trigger each other
let selectionChangeFromOutside = false;
let selectionChangeFromInside = false;

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
