import {useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/utility/toastService';
import {confirmationService} from '@/utility/confirmationService';
import {useDataSource} from '@/data/dataSource';

/**
 * Presents a confirmation dialog to the user and clears the schema if the user confirms.
 * @param message The message to show in the confirmation dialog. If undefined, the schema is cleared without
 *   confirmation.
 */
export function newEmptySchemaFile(message: string | undefined = undefined): void {
  if (!message) {
    clearSchema();
    return;
  }
  confirmationService.require({
    message: message,
    header: 'Confirm',
    icon: 'pi pi-info-circle',
    acceptClass: 'p-button-danger',
    accept: () => {
      toastService.add({
        severity: 'info',
        summary: 'Confirmed',
        detail: 'Schema editor cleared',
        life: 3000,
      });
      clearSchema();
    },
  });
}
function clearSchema() {
  useDataSource().userSchemaData.value = {};
  useSessionStore().updateCurrentPath([]);
  useSessionStore().updateCurrentSelectedElement([]);
}

/**
 * Opens a confirmation dialog to the user and clears the schema if the user confirms.
 */
export function openClearSchemaDialog() {
  newEmptySchemaFile(
    ' This will delete the current schema from the schema editor. Are you sure you want to continue?'
  );
}
