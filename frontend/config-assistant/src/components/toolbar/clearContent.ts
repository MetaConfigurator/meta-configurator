import {useDataStore} from '@/store/dataStore';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';

export function clearEditor(): void {
  // Show confirmation dialog
  const confirmClear = window.confirm('Are you sure you want to clear the editor?');

  if (confirmClear) {
    // User confirmed, clear the editor
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    useDataStore().fileData = {};
  }
}
