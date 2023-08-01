import {useDataStore} from '@/store/dataStore';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {ref} from 'vue';

export const showConfirmation = ref(false);
export const confirmationDialogMessage = ref('');

export function newEmptyFile(message: string | undefined = undefined): void {
  console.log(JSON.stringify(useSessionStore().fileData) === '{}');
  if (JSON.stringify(useSessionStore().fileData) === '{}') {
    // no data, so we don't have to ask user if he wants to clear it
    return;
  }
  // Show confirmation dialog
  if (message !== undefined) {
    confirmationDialogMessage.value = message;
    showConfirmation.value = true;
    return;
  }
  // User confirmed, clear the editor
  clearEditor();
}

export function clearEditor() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().fileData = {};
  useSessionStore().updateCurrentPath([]);
  useSessionStore().updateCurrentSelectedElement([]);
}
