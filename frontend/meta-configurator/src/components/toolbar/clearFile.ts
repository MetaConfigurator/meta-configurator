import {useDataStore} from '@/store/dataStore';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';

export function clearFile(dialogMessage: string | undefined = undefined): boolean {
  let performClear = true;

  // Show confirmation dialog
  if (dialogMessage !== undefined) {
    // if user dialog is active: overwrite performClear by user choice
    performClear = window.confirm(dialogMessage);
  }

  if (performClear) {
    // User confirmed, clear the editor
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    useDataStore().fileData = {};
    useSessionStore().updateCurrentPath([]);
    useSessionStore().updateCurrentSelectedElement([]);
  }

  return performClear;
}
