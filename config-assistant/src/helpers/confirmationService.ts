import type {ToastServiceMethods} from 'primevue/toastservice';
import type {ConfirmationServiceMethods} from 'primevue/confirmationservice';
import {ref} from 'vue';
import type {Ref} from 'vue';
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
    this.confirm?.require(options);
  }
}

export const confirmationService = new ConfirmationService();
