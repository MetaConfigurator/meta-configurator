import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/helpers/toastService';
import {confirmationService} from '@/helpers/confirmationService';
import {useDataStore} from '@/store/dataStore';
import {generateSampleData} from '@/components/toolbar/createSampleData';
import {errorService} from '@/main';

export function newEmptyFileAfterGeneration(message: string | undefined = undefined): void {
  if (!message) {
    clearEditorGeneration();
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
      clearEditorGeneration();
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
export function clearEditorGeneration() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  generateSampleData(useDataStore().schemaData)
    .then(data => (useDataStore().fileData = data))
    .catch((error: Error) =>
      errorService.onError({
        message: 'Error generating sample data',
        details: error.message,
        stack: error.stack,
      })
    );
}
