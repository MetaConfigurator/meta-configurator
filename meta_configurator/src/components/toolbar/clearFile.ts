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
 * Clears the current file data (depending on current mode) without confirmation.
 */
export function clearCurrentFile() {
  newEmptyFile({
    message: null,
    dataLink: useCurrentData(),
    confirmMessage: null,
  });
}

/**
 * Shows a confirmation dialog to the user and clears the file in the DataEditor if the user confirms.
 */
export function openClearDataEditorDialog() {
  newEmptyFile({
    message:
      'Do you also want to clear the data in the Data Editor?',
    dataLink: getDataForMode(SessionMode.DataEditor),
    confirmMessage: 'New empty file created in the DataEditor.',
  });
}
