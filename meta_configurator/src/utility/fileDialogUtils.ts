import {useFileDialog} from '@vueuse/core';

type FileSelectionHandler = (files: FileList) => void;

export function createLazySingleFileDialog(accept: string, openDelayMs: number = 3) {
  let currentHandler: FileSelectionHandler | undefined;
  let dialog:
    | {
        open: () => void;
        onChange: (handler: (files: FileList | null) => void) => void;
        reset: () => void;
      }
    | undefined;

  function ensureDialog() {
    if (!dialog) {
      const {open, onChange, reset} = useFileDialog({
        accept,
        multiple: false,
      });

      onChange((files: FileList | null) => {
        if (files && files.length > 0) {
          currentHandler?.(files);
        }
        reset();
      });

      dialog = {open, onChange, reset};
    }
    return dialog;
  }

  return {
    openForSelection(handler: FileSelectionHandler) {
      currentHandler = handler;
      const {open} = ensureDialog();
      setTimeout(() => {
        open();
      }, openDelayMs);
    },
  };
}
