import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/helpers/toastService';
import {confirmationService} from '@/helpers/confirmationService';
import {useDataStore} from '@/store/dataStore';

export function newEmptyFile(message: string | undefined = undefined): void {
  if (!message) {
    clearFile();
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
        detail: 'Config data is deleted from File editor',
        life: 3000,
      });
      clearFile();
    },
    reject: () => {
      toastService.add({
        severity: 'error',
        summary: 'Rejected',
        detail: 'Config data is kept in File Editor',
        life: 3000,
      });
    },
  });
}
export function clearFile() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().fileData = {};
  useSessionStore().updateCurrentPath([]);
  useSessionStore().updateCurrentSelectedElement([]);
}
