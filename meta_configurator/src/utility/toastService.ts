import type {ToastServiceMethods} from 'primevue/toastservice';
import type {ToastMessageOptions} from 'primevue/toast';

/**
 * Service for displaying toasts.
 */
export class ToastService implements ToastServiceMethods {
  constructor(public toast?: ToastServiceMethods) {}

  add(message: ToastMessageOptions): void {
    this.toast?.add(message);
  }

  removeAllGroups(): void {
    this.toast?.removeAllGroups();
  }

  removeGroup(group: string): void {
    this.toast?.removeGroup(group);
  }

  remove(message: ToastMessageOptions): void {
    this.toast?.remove(message);
  }
}

export const toastService = new ToastService();
