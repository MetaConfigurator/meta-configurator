import {watch} from 'vue';
import {useDataStore} from '@/store/dataStore';
import {useSettingsStore} from '@/store/settingsStore';
import VueCookies from 'vue-cookies';

const cookiesHandler = {
  initializeFromCookies: () => {
    console.log('Initializing from cookies...');

    const schemaDataCookie = VueCookies.get('schemaData');
    const settingsDataCookie = VueCookies.get('settingsData');
    const fileDataCookie = VueCookies.get('fileData');

    // Size estimation function
    const estimateSize = data => {
      return encodeURIComponent(JSON.stringify(data)).length;
    };

    // Check and handle cookie size limit
    const maxCookieSize = 4000; // 4KB limit

    if (
      schemaDataCookie &&
      settingsDataCookie &&
      fileDataCookie &&
      estimateSize(schemaDataCookie) <= maxCookieSize &&
      estimateSize(settingsDataCookie) <= maxCookieSize &&
      estimateSize(fileDataCookie) <= maxCookieSize
    ) {
      try {
        if (schemaDataCookie !== 'undefined') {
          useDataStore().schemaData = JSON.parse(schemaDataCookie);
        }
        if (fileDataCookie !== 'undefined') {
          useDataStore().fileData = JSON.parse(fileDataCookie);
        }
        if (settingsDataCookie !== 'undefined') {
          useSettingsStore().settingsData = JSON.parse(settingsDataCookie);
        }
      } catch (error) {
        console.error('Error parsing cookies:', error);
      }
    } else {
      console.warn('Cookie size exceeds limit. Skipping initialization.');
    }

    // Watch for changes in schemaData, settingsData, and fileData and update cookies
    watch(
      [
        () => useDataStore().schemaData,
        () => useSettingsStore().settingsData,
        () => useDataStore().fileData,
      ],
      ([newSchemaData, newSettingsData, newFileData]) => {
        const compressedSchemaData = JSON.stringify(newSchemaData);
        const compressedSettingsData = JSON.stringify(newSettingsData);
        const compressedFileData = JSON.stringify(newFileData);

        if (
          estimateSize(compressedSchemaData) <= maxCookieSize &&
          estimateSize(compressedSettingsData) <= maxCookieSize &&
          estimateSize(compressedFileData) <= maxCookieSize
        ) {
          VueCookies.set('schemaData', compressedSchemaData);
          VueCookies.set('settingsData', compressedSettingsData);
          VueCookies.set('fileData', compressedFileData);
          console.log('Cookies updated:', newSchemaData, newSettingsData, newFileData);
        } else {
          console.warn('Cookie size exceeds limit. Cookies not updated.');
        }
      }
    );
  },
};

export default cookiesHandler;
