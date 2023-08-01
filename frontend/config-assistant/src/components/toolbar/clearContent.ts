import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/helpers/toastService';
import {confirmationService} from '@/helpers/confirmationService';

export function newEmptyFile(message: string | undefined = undefined): void {
  if (!message) {
    clearEditor();
    return;
  }
  confirmationService.require({
    message: message,
    header: 'Delete Confirmation',
    icon: 'pi pi-info-circle',
    acceptClass: 'p-button-danger',
    accept: () => {
      toastService.add({
        severity: 'info',
        summary: 'Confirmed',
        detail: 'Config data deleted',
        life: 3000,
      });
      clearEditor();
    },
    reject: () => {
      toastService.add({
        severity: 'error',
        summary: 'Rejected',
        detail: 'Config data is keep',
        life: 3000,
      });
    },
  });
}
export function clearEditor() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().fileData = {};
  useSessionStore().updateCurrentPath([]);
  useSessionStore().updateCurrentSelectedElement([]);
}
