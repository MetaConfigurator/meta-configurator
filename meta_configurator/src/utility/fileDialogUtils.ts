import {useFileDialog} from '@vueuse/core';

type FileSelectionHandler = (files: FileList) => void;

/**
 * Creates a file dialog for a single file. The underlying input element is built when the
 * dialog is opened for the first time and reused afterwards.
 */
export function createLazySingleFileDialog(accept: string, openDelayMs: number = 3) {
  return createLazyFileDialog(accept, false, openDelayMs);
}

/** Same as {@link createLazySingleFileDialog}, but several files can be selected at once. */
export function createLazyMultiFileDialog(accept: string, openDelayMs: number = 3) {
  return createLazyFileDialog(accept, true, openDelayMs);
}

function createLazyFileDialog(
  accept: string,
  multiple: boolean,
  openDelayMs: number
): {openForSelection: (handler: FileSelectionHandler) => void} {
  let currentHandler: FileSelectionHandler | undefined;
  let openDialog: (() => void) | undefined;

  function ensureDialog(): () => void {
    if (!openDialog) {
      const {open, onChange, reset} = useFileDialog({accept, multiple});

      onChange((files: FileList | null) => {
        if (files && files.length > 0) {
          currentHandler?.(files);
        }
        reset();
      });

      openDialog = open;
    }
    return openDialog;
  }

  return {
    openForSelection(handler: FileSelectionHandler) {
      currentHandler = handler;
      const open = ensureDialog();
      setTimeout(open, openDelayMs);
    },
  };
}
