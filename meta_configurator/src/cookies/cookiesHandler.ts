import {watch} from 'vue';
import VueCookies from 'vue-cookies';
import {errorService} from '@/main';
import {setSettings} from '@/settings/useSettings';
import {useDataSource} from '@/data/dataSource';
import {useCurrentSchema} from '@/data/useDataLink';

/**
 * We use cookies to store the settings data
 * This way, the settings are persisted between sessions.
 * We currently only store them for 7 days.
 * Note: Cookies have a size limit of 4KB
 */
const cookiesHandler = {
  initializeFromCookies: () => {
    // @ts-ignore
    if (VueCookies.isKey('settingsData')) {
      // @ts-ignore
      const settingsDataCookie = VueCookies.get('settingsData');

      if (settingsDataCookie) {
        try {
          if (settingsDataCookie !== 'undefined') {
            setSettings(settingsDataCookie);
            useCurrentSchema().reloadSchema();
          }
        } catch (error) {
          errorService.onError(error);
        }
      }
    }

    // Check and handle cookie size limit
    const maxCookieSize = 4000; // 4KB limit

    // Watch for changes in settingsData and update cookies
    watch(
      () => useDataSource().settingsData,

      newSettingsData => {
        if (estimateSize(newSettingsData) <= maxCookieSize) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7); // Expires in 7 days

          // @ts-ignore
          VueCookies.set('settingsData', newSettingsData, {
            expires: expiryDate,
          });
        }
      }
    );
  },
};

function estimateSize(data: any) {
  return encodeURIComponent(JSON.stringify(data)).length;
}

export default cookiesHandler;
