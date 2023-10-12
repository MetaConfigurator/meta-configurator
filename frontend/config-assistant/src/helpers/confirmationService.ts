import type {ConfirmationServiceMethods} from 'primevue/confirmationservice';
import type {ConfirmationOptions} from 'primevue/confirmationoptions';

export class ConfirmationService implements ConfirmationServiceMethods {
  confirm: ConfirmationServiceMethods | undefined;

  constructor(confirm?: ConfirmationServiceMethods) {
    this.confirm = confirm;
  }

  close(): void {
    this.confirm?.close();
  }

  require(options: ConfirmationOptions): void {
    // Close is needed, because otherwise the following issue happens:
    // When a confirmation button from a dialog is accepted and then in turns opens another dialog,
    // the second dialog would instantly be seen as accepted too.
    // By closing the first dialog beforehand, this does not happen.
    close();
    this.confirm?.require(options);
  }
}

export const confirmationService = new ConfirmationService();
