import {Editor} from 'brace';
// @ts-ignore
import {useDebounceFn, watchImmediate} from '@vueuse/core/index';
import {getDataForMode} from '@/data/useDataLink';
import type {SessionMode} from '@/store/sessionMode';

let currentChangeFromOutside = false;
let currentChangeFromInside = false;

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
