import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {errorService} from '@/main';

/**
 * Opens a file dialog to select a file to upload.
 */
export function openUploadFileDialog(): void {
  const inputElement = document.createElement('input');

  inputElement.type = 'file';

  inputElement.onchange = event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = e => {
        const contents = e.target?.result as string;
        try {
          useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
          useSessionStore().editorContentUnparsed = contents;
        } catch (error) {
          errorService.onError(error);
        }
      };
      reader.readAsText(file);
    }
  };
  inputElement.click();
}
