import ErrorService from './errorService';
import type {ToastServiceMethods} from 'primevue/toastservice';

let errorService: ErrorService | null = null;

/**
 * Initialize the global ErrorService instance.
 * Should be called from main.ts when the Vue app is created.
 */
export function initErrorService(toast: ToastServiceMethods) {
  errorService = new ErrorService(toast);
}

/**
 * Get the ErrorService instance anywhere in the app.
 */
export function useErrorService(): ErrorService {
  if (!errorService) {
    throw new Error('ErrorService not initialized. Call initErrorService() first.');
  }
  return errorService;
}
