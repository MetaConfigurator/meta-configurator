import {SessionMode, useSessionStore} from '@/store/sessionStore';
import {toastService} from '@/utility/toastService';
import {confirmationService} from '@/utility/confirmationService';
import _ from 'lodash';
import {getDataLinkForMode, useCurrentDataLink} from '@/data/useDataLink';
import type {DataLink} from '@/data/dataLink';

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
  dataLink = useCurrentDataLink(),
  confirmMessage = null,
}: {
  message?: string | null;
  dataLink?: DataLink;
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

function clearFile(dataLink: DataLink) {
  dataLink.setData({});
  useSessionStore().updateCurrentPath([]); // todo introduce reset method
  useSessionStore().updateCurrentSelectedElement([]);
}

/**
 * Opens a confirmation dialog to the user and clears the file if the user confirms.
 */
export function openClearCurrentFileDialog() {
  newEmptyFile({
    message: 'This will delete the current file. Are you sure you want to continue?',
    dataLink: useCurrentDataLink(),
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
    dataLink: getDataLinkForMode(SessionMode.SchemaEditor),
  });
}

/**
 * Shows a confirmation dialog to the user and clears the file in the FileEditor if the user confirms.
 */
export function openClearFileEditorDialog() {
  newEmptyFile({
    message:
      'Do you also want to create a new empty file in the FileEditor? (The current file will be deleted)',
    dataLink: getDataLinkForMode(SessionMode.FileEditor),
    confirmMessage: 'New empty file created in the FileEditor.',
  });
}
