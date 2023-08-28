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
  });
}
export function clearSchema() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().schemaData = {};
  useSessionStore().updateCurrentPath([]);
  useSessionStore().updateCurrentSelectedElement([]);
}
export function openClearSchemaDialog() {
  newEmptySchemafile(
    ' This will delete current schema from schema editor. Are you sure you want to continue?'
  );
}
