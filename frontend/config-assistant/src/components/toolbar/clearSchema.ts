import {useDataStore} from '@/store/dataStore';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/helpers/toastService';
import {confirmationService} from '@/helpers/confirmationService';

export function newEmptySchemafile(message: string | undefined = undefined): void {
  if (!message) {
    clearSchema();
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
        detail: 'Schema is deleted',
        life: 3000,
      });
      clearSchema();
    },
    reject: () => {
      toastService.add({
        severity: 'error',
        summary: 'Rejected',
        detail: 'Schema is kept',
        life: 3000,
      });
    },
  });
}
export function clearSchema() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().schemaData = {};
  useSessionStore().updateCurrentPath([]);
  useSessionStore().updateCurrentSelectedElement([]);
}
