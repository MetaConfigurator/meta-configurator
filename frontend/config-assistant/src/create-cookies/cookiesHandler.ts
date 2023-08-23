import {watch} from 'vue';
import {useDataStore} from '@/store/dataStore';
import {useSettingsStore} from '@/store/settingsStore';
import {useCookie} from 'vue-cookie-next';
console.log('Imported useCookie:', useCookie);
const cookiesHandler = {
  initializeFromCookies: () => {
    console.log('Initializing from cookies...');
    const $cookie = useCookie();
    console.log('$cookie:', $cookie);
    const schemaDataCookie = $cookie.getCookie('schemaData');
    const settingsDataCookie = $cookie.getCookie('settingsData');
    const fileDataCookie = $cookie.getCookie('fileData');

    if (schemaDataCookie && schemaDataCookie !== 'undefined') {
      useDataStore().schemaData = JSON.parse(schemaDataCookie);
    }
    if (fileDataCookie && fileDataCookie !== 'undefined') {
      useDataStore().fileData = JSON.parse(fileDataCookie);
    }
    if (settingsDataCookie && settingsDataCookie !== 'undefined') {
      useSettingsStore().settingsData = JSON.parse(settingsDataCookie);
    }

    // Watch for changes in schemaData, settingsData, and fileData and update cookies
    watch(
      [
        () => useDataStore().schemaData,
        () => useSettingsStore().settingsData,
        () => useDataStore().fileData,
      ],
      ([newSchemaData, newSettingsData, newFileData]) => {
        const schemaDataForCookies = JSON.stringify(newSchemaData);
        const settingsDataForCookies = JSON.stringify(newSettingsData);
        const fileDataForCookies = JSON.stringify(newFileData);

        $cookie.setCookie('schemaData', schemaDataForCookies);
        $cookie.setCookie('settingsData', settingsDataForCookies);
        $cookie.setCookie('fileData', fileDataForCookies);
        console.log('Cookies updated:', newSchemaData, newSettingsData, newFileData);
      }
    );
  },
};

export default cookiesHandler;
