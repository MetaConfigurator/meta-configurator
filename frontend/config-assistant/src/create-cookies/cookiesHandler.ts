import {watch} from 'vue';
import {useSettingsStore} from '@/store/settingsStore';
import VueCookies from 'vue-cookies';

const cookiesHandler = {
  initializeFromCookies: () => {
    console.log('Initializing from cookies...');

    const settingsDataCookie = VueCookies.get('settingsData');

    // Size estimation function
    const estimateSize = data => {
      return encodeURIComponent(JSON.stringify(data)).length;
    };

    // Check and handle cookie size limit
    const maxCookieSize = 4000; // 4KB limit

    if (settingsDataCookie && estimateSize(settingsDataCookie) <= maxCookieSize) {
      try {
        if (settingsDataCookie !== 'undefined') {
          useSettingsStore().settingsData = JSON.parse(settingsDataCookie);
        }
      } catch (error) {
        console.error('Error parsing cookies:', error);
      }
    } else {
      console.warn('Cookie size exceeds limit. Skipping initialization.');
    }

    // Watch for changes in settingsData and update cookies
    watch(
      () => useSettingsStore().settingsData,
      newSettingsData => {
        const compressedSettingsData = JSON.stringify(newSettingsData);

        if (estimateSize(compressedSettingsData) <= maxCookieSize) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7); // Example: Expires in 7 days

          VueCookies.set('settingsData', compressedSettingsData, {
            expires: expiryDate,
          });
          console.log('SettingsData cookie updated:', newSettingsData);
        } else {
          console.warn('Cookie size exceeds limit. SettingsData cookie not updated.');
        }
      }
    );
  },
};

export default cookiesHandler;
