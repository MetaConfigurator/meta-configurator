import type {ToastServiceMethods} from 'primevue/toastservice';

/**
 * Service that handles errors and warnings.
 */
export default class ErrorService {
  toast: ToastServiceMethods;

  constructor(toast: ToastServiceMethods) {
    this.toast = toast;
  }

  onError(error: unknown) {
    console.error(error);
    this.toast.add({
      severity: 'error',
      summary: this.getSummary(error),
      detail: this.getDetails(error),
      life: 5_000,
    });
  }

  onWarning(warning: unknown) {
    console.warn(warning);
    this.toast.add({
      severity: 'warn',
      summary: this.getSummary(warning),
      detail: this.getDetails(warning),
      life: 5_000,
    });
  }

  getSummary(error: unknown): string {
    if ((error as any).summary) {
      return (error as any).summary;
    }
    return 'Unknown Error occurred';
  }

  getDetails(error: unknown): string {
    if ((error as any).details) {
      return (error as any).details;
    }
    return (error as any).toString();
  }
}

/**
 * Can be used to throw errors with a detailed message.
 */
export class ErrorWithDetails extends Error {
  details: string;
  message: string;
  stack?: string | undefined;

  constructor(error: Error, details: string) {
    super(error.message);
    this.details = details;
    this.message = error.message;
    this.stack = error.stack;
  }
}
