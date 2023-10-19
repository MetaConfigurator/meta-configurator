import {watch} from 'vue';
import {useSettingsStore} from '@/store/settingsStore';
import VueCookies from 'vue-cookies';
import {errorService} from '@/main';

/**
 * We use cookies to store the settings data
 * This way, the settings are persisted between sessions.
 * We currently only store them for 7 days.
 * Note: Cookies have a size limit of 4KB
 */
const cookiesHandler = {
  initializeFromCookies: () => {
    if (VueCookies.isKey('settingsData')) {
      const settingsDataCookie = VueCookies.get('settingsData');

      if (settingsDataCookie) {
        try {
          if (settingsDataCookie !== 'undefined') {
            useSettingsStore().settingsData = settingsDataCookie;
          }
        } catch (error) {
          errorService.onError(error);
        }
      }
    }

    // Size estimation function
    const estimateSize = data => {
      return encodeURIComponent(JSON.stringify(data)).length;
    };

    // Check and handle cookie size limit
    const maxCookieSize = 4000; // 4KB limit

    // Watch for changes in settingsData and update cookies
    watch(
      () => useSettingsStore().settingsData,

      newSettingsData => {
        if (estimateSize(newSettingsData) <= maxCookieSize) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7); // Expires in 7 days

          VueCookies.set('settingsData', newSettingsData, {
            expires: expiryDate,
          });
        }
      }
    );
  },
};

export default cookiesHandler;
