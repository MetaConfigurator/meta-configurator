import {Editor} from 'brace';
// @ts-ignore
import {useDebounceFn, watchImmediate} from '@vueuse/core/index';
import {useCurrentData} from '@/data/useDataLink';

let currentChangeFromOutside = false;
let currentChangeFromInside = false;

export function setupLinkToData(editor: Editor) {
  setupUpdateContentWhenDataChanges(editor);
  setupPropagationOfEditorContentChanges(editor);
}

function setupUpdateContentWhenDataChanges(editor: Editor) {
  watchImmediate(
    () => useCurrentData().unparsedData.value,
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
function setupPropagationOfEditorContentChanges(editor: Editor) {
  editor.on(
    'change',
    useDebounceFn(() => {
      if (currentChangeFromOutside) {
        currentChangeFromOutside = false; // reset flag
        return;
      }

      currentChangeFromInside = true;
      useCurrentData().unparsedData.value = editor.getValue();
    }, 100)
  );
}
