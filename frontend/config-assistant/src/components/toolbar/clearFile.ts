import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/utility/toastService';
import {confirmationService} from '@/utility/confirmationService';
import {useDataStore} from '@/store/dataStore';
import _ from 'lodash';

/**
 * Presents a confirmation dialog to the user and clears the file if the user confirms.
 * @param message The message to show in the confirmation dialog. If undefined, the file is cleared without
 *   confirmation.
 */
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
function clearFile() {
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().fileData = {};
  useSessionStore().updateCurrentPath([]);
  useSessionStore().updateCurrentSelectedElement([]);
}

/**
 * Opens a confirmation dialog to the user and clears the file if the user confirms.
 */
export function openClearFileDialog() {
  newEmptyFile(' This will delete the current file. Are you sure you want to continue?');
}
