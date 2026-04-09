import {ref, type Ref, watch} from 'vue';

/**
 * API key handling for user-provided credentials.
 *
 * The key lives in memory by default and is lost on page refresh. If the user
 * opts in, it is additionally saved to sessionStorage so it survives a refresh
 * within the same tab but is cleared when the tab or browser is closed.
 *
 * localStorage is intentionally not used: both sessionStorage and localStorage
 * are readable by same-origin scripts, so neither offers protection against
 * active JavaScript on the page. The only meaningful difference is persistence
 * lifetime. Limiting to sessionStorage reduces the window of exposure.
 */

const STORAGE_KEY = 'mc_api_key';

const apiKey: Ref<string> = ref('');
const rememberInTab: Ref<boolean> = ref(false);

export function initApiKey(): void {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    apiKey.value = stored;
    rememberInTab.value = true;
  }
}

watch(apiKey, newValue => {
  if (!rememberInTab.value) return;
  if (newValue) {
    sessionStorage.setItem(STORAGE_KEY, newValue);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
});

watch(rememberInTab, newValue => {
  if (newValue && apiKey.value) {
    sessionStorage.setItem(STORAGE_KEY, apiKey.value);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
});

/** Returns the current API key value. Valid synchronously after initApiKey() is called. */
export function getApiKey(): string {
  return apiKey.value;
}

export function getApiKeyRef(): Ref<string> {
  return apiKey;
}

export function getRememberInTabRef(): Ref<boolean> {
  return rememberInTab;
}
