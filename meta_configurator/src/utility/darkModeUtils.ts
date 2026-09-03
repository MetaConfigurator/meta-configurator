import {usePreferredDark} from '@vueuse/core';

/**
 * The app follows the operating system colour scheme (PrimeVue is configured with
 * `darkModeSelector: 'system'`), so this reactive flag is the single source of truth.
 */
export const isDarkMode = usePreferredDark();
