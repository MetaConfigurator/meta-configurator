import {useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/utility/toastService';
import {confirmationService} from '@/utility/confirmationService';
import _ from 'lodash';
import {getDataForMode, getSessionForMode, useCurrentData} from '@/data/useDataLink';
import type {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';

/**
 * Presents a confirmation dialog to the user and clears the file if the user confirms.
 * @param message The message to show in the confirmation dialog. If undefined, the file is cleared without
 *   confirmation.
 * @param dataLink The data link to clear the file of. If undefined, the current data link is used.
 * @param confirmMessage The message to show in the toast after the file has been cleared. If undefined, no
 *  toast is shown.
 */
function newEmptyFile({
  message = null,
  dataLink = useCurrentData(),
  confirmMessage = null,
}: {
  message?: string | null;
  dataLink?: ManagedData;
  confirmMessage?: string | null;
}): void {
  if (_.isEmpty(dataLink.data.value)) {
    // file already is empty -> no need for clearing
    return;
  }
  if (message == null) {
    clearFile(dataLink);
    return;
  }
  confirmationService.require({
    message: message,
    header: 'Delete Confirmation',
    icon: 'pi pi-info-circle',
    acceptClass: 'p-button-danger',
    accept: () => {
      if (confirmMessage != null) {
        toastService.add({
          severity: 'info',
          summary: 'Deletion successful',
          detail: confirmMessage,
          life: 3000,
        });
      }
      clearFile(dataLink);
    },
  });
}

function clearFile(dataLink: ManagedData) {
  dataLink.setData({});
  let mode = useSessionStore().currentMode;
  getSessionForMode(mode).updateCurrentPath([]); // todo introduce reset method
  getSessionForMode(mode).updateCurrentSelectedElement([]);
}

/**
 * Opens a confirmation dialog to the user and clears the file if the user confirms.
 */
export function openClearCurrentFileDialog() {
  newEmptyFile({
    message: 'This will delete the current file. Are you sure you want to continue?',
    dataLink: useCurrentData(),
    confirmMessage: null,
  });
}

/**
 * Opens a confirmation dialog to the user and clears the schema if the user confirms.
 */
export function openClearSchemaDialog() {
  newEmptyFile({
    message: 'This will delete the current schema. Are you sure you want to continue?',
    confirmMessage: null,
    dataLink: getDataForMode(SessionMode.SchemaEditor),
  });
}

/**
 * Shows a confirmation dialog to the user and clears the file in the DataEditor if the user confirms.
 */
export function openClearDataEditorDialog() {
  newEmptyFile({
    message:
      'Do you also want to create a new empty file in the DataEditor? (The current file will be deleted)',
    dataLink: getDataForMode(SessionMode.DataEditor),
    confirmMessage: 'New empty file created in the DataEditor.',
  });
}
