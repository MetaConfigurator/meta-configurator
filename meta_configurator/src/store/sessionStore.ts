import type {Ref} from 'vue';
import {ref} from 'vue';
import {defineStore} from 'pinia';
import {SessionMode} from '@/store/sessionMode';

/**
 * Store that manages all data that is specific to the current session,
 * including the current selected path, the validation results, and the current mode.
 */
export const useSessionStore = defineStore('sessionStore', () => {
  /**
   * The current mode of the application.
   */
  const currentMode: Ref<SessionMode> = ref<SessionMode>(SessionMode.FileEditor);
  const hasShownInitialDialog = ref<boolean>(false);

  return {
    currentMode,
    hasShownInitialDialog,
  };
});
