import type {ToastServiceMethods} from 'primevue/toastservice';
import {useDebounceFn, useThrottleFn} from '@vueuse/core';

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

  onErrorThrottled = useThrottleFn(this.onError, 5000);

  onWarning(warning: unknown) {
    console.warn(warning);
    this.toast.add({
      severity: 'warn',
      summary: this.getSummary(warning),
      detail: this.getDetails(warning),
      life: 5_000,
    });
  }

  onWarningThrottled = useThrottleFn(this.onWarning, 5000);

  getSummary(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown Error occurred';
  }

  getDetails(error: unknown): string {
    if ((error as any).details) {
      return (error as any).details;
    }
    return '';
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
