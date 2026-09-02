import {onBeforeUnmount, ref, watch, type Ref} from 'vue';
import * as ace from 'brace';
import type {Editor} from 'brace';
// The mode files reference the global that importing brace itself installs, so they must
// be imported here, after brace, instead of in the components that select a mode.
import 'brace/mode/javascript';
import 'brace/mode/jsoniq';
import {setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {useSettings} from '@/settings/useSettings';

/** An Ace mode id such as 'ace/mode/javascript', or an instance of a custom mode. */
export type AceEditorMode = string | object;

export type AceEditorSetup = {
  mode?: AceEditorMode;
  useWrapMode?: boolean;
  onContentChanged?: (content: string) => void;
  configureEditor?: (editor: Editor) => void | (() => void);
};

let nextAceEditorId = 0;

export function createAceEditorElementId(editorElementIdPrefix: string): string {
  return `${editorElementIdPrefix}-${nextAceEditorId++}`;
}

/**
 * Shared lifecycle for the Ace editors embedded in dialogs and panels: it creates the
 * editor inside a uniquely identified container, keeps the given content ref and the
 * editor in sync in both directions, and destroys the editor when the owner unmounts.
 *
 * Callers render `<div :id="editorElementId" />` and call `createEditor` once that
 * container exists, which for a dialog means after `nextTick` following its opening.
 */
export function useAceEditor(
  editorElementIdPrefix: string,
  content: Ref<string>,
  setup: AceEditorSetup
) {
  const editorElementId = createAceEditorElementId(editorElementIdPrefix);
  const editor = ref<Editor | null>(null);
  const settings = useSettings();
  let isApplyingContentToEditor = false;
  let disposeEditorConfiguration: (() => void) | undefined;

  function createEditor(): void {
    if (!document.getElementById(editorElementId)) {
      return;
    }
    destroyEditor();

    const createdEditor = ace.edit(editorElementId);
    editor.value = createdEditor;

    const disposeAceProperties = setupAceProperties(createdEditor, settings.value);
    const disposeCallerConfiguration = setup.configureEditor?.(createdEditor);
    disposeEditorConfiguration = () => {
      disposeCallerConfiguration?.();
      disposeAceProperties();
    };
    createdEditor.getSession().setUseWorker(false);
    if (setup.useWrapMode) {
      createdEditor.getSession().setUseWrapMode(true);
      createdEditor.setOption('wrap', true);
    }
    createdEditor.on('change', () => {
      if (isApplyingContentToEditor) {
        return;
      }
      const newContent = createdEditor.getValue();
      content.value = newContent;
      setup.onContentChanged?.(newContent);
    });

    if (setup.mode) {
      setEditorMode(setup.mode);
    }
    applyContentToEditor(content.value);
  }

  function destroyEditor(): void {
    if (!editor.value) {
      return;
    }
    content.value = editor.value.getValue();
    disposeEditorConfiguration?.();
    disposeEditorConfiguration = undefined;
    editor.value.destroy();
    editor.value.container.innerHTML = '';
    editor.value = null;
  }

  function setEditorMode(mode: AceEditorMode): void {
    editor.value?.getSession().setMode(mode as string);
  }

  function applyContentToEditor(newContent: string): void {
    if (!editor.value || editor.value.getValue() === newContent) {
      return;
    }
    isApplyingContentToEditor = true;
    try {
      editor.value.setValue(newContent, -1);
    } finally {
      isApplyingContentToEditor = false;
    }
  }

  watch(content, applyContentToEditor);
  onBeforeUnmount(destroyEditor);

  return {editorElementId, editor, createEditor, destroyEditor, setEditorMode};
}
