import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';

export function clearEditor(dialogMessage: string): void {
  // Show confirmation dialog
  const confirmClear = window.confirm(dialogMessage);

  if (confirmClear) {
    // User confirmed, clear the editor
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    useSessionStore().currentEditorWrapper.setContent('');
  }
}
