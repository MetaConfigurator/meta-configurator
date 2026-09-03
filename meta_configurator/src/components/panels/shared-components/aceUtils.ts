import type {Editor} from 'brace';
import {watchImmediate} from '@vueuse/core';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {isDarkMode} from '@/utility/darkModeUtils';
import type {UndoManager} from '@/data/undoManager';
import type {WatchStopHandle} from 'vue';

/**
 * change the mode depending on the data format.
 * to support new data formats, they need to be added here too.
 */
export function setupAceMode(editor: Editor, settings: SettingsInterfaceRoot): WatchStopHandle {
  return watchImmediate(
    () => settings.dataFormat,
    format => {
      if (format == 'json') {
        editor.getSession().setMode('ace/mode/json');
      } else if (format == 'yaml') {
        editor.getSession().setMode('ace/mode/yaml');
      } else if (format == 'xml') {
        editor.getSession().setMode('ace/mode/xml');
      }
    }
  );
}

export function setupAceProperties(editor: Editor, settings: SettingsInterfaceRoot): () => void {
  editor.$blockScrolling = Infinity;
  editor.setOptions({
    autoScrollEditorIntoView: true, // this is needed if editor is inside scrollable page
  });
  editor.setShowPrintMargin(false);

  const stopWatchingTheme = watchImmediate(isDarkMode, darkModeEnabled => {
    editor.setTheme(darkModeEnabled ? 'ace/theme/clouds_midnight' : 'ace/theme/clouds');
  });
  const stopWatchingTabSize = watchImmediate(
    () => settings.textEditor.tabSize,
    tabSize => editor.getSession().setTabSize(tabSize)
  );

  // it's not clear why timeout is needed here, but without it the
  // ace editor starts flashing and becomes unusable
  let stopWatchingFontSize: WatchStopHandle | undefined;
  const fontSizeWatcherTimeout = window.setTimeout(() => {
    stopWatchingFontSize = watchImmediate(
      () => settings.textEditor.fontSize,
      fontSize => {
        if (fontSize && fontSize > 6 && fontSize < 65) {
          editor.setFontSize(`${fontSize}px`);
        }
      }
    );
  }, 0);

  return () => {
    window.clearTimeout(fontSizeWatcherTimeout);
    stopWatchingFontSize?.();
    stopWatchingTabSize();
    stopWatchingTheme();
  };
}

export function connectAceUndoManagerToGlobalUndo(editor: Editor, undoManager: UndoManager) {
  editor.getSession().setUndoManager({
    execute() {},
    undo() {
      undoManager.undo();
      return undefined as any;
    },
    redo() {
      undoManager.redo();
    },
    reset() {
      undoManager.clear();
    },
    hasUndo() {
      return undoManager.canUndo.value;
    },
    hasRedo() {
      return undoManager.canRedo.value;
    },
    isClean() {
      return !undoManager.canUndo.value;
    },
    markClean() {},
  } as any);
}
