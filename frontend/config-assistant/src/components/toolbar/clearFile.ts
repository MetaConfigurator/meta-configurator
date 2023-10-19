import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/utility/toastService';
import {confirmationService} from '@/utility/confirmationService';
import {useDataStore} from '@/store/dataStore';
import _ from 'lodash';

export function newEmptyFile(message: string | undefined = undefined): void {
  if (_.isEmpty(useDataStore().fileData)) {
    // file already is empty -> no need for clearing
    return;
  }
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
  });
}
export function clearFile() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().fileData = {};
  useSessionStore().updateCurrentPath([]);
  useSessionStore().updateCurrentSelectedElement([]);
}
export function openClearFileDialog() {
  newEmptyFile(
    ' This will delete current config from File editor. Are you sure you want to continue?'
  );
}
