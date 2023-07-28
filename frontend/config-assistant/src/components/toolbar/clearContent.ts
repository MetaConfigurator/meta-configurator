import {useDataStore} from '@/store/dataStore';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';

export function clearEditor(message: string | undefined = undefined): void {
  let performClear = true;
  // Show confirmation dialog
  if (message !== undefined) {
    performClear = window.confirm(message);
  }

  if (performClear) {
    // User confirmed, clear the editor
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    useDataStore().fileData = {};
    useSessionStore().updateCurrentPath([]);
    useSessionStore().updateCurrentSelectedElement([]);
  }
}
